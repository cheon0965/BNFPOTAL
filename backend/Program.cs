// ============================================================================
// 파일명: Program.cs
// 경로: Backend/Program.cs
// 설명: ASP.NET Core 애플리케이션 진입점 - DI, 미들웨어, 서비스 구성
// ----------------------------------------------------------------------------
// [주요 구성 항목]
//   1. 서비스 등록 (DI Container)
//      - DbContext, JWT 서비스, 이메일 서비스 등
//   2. 인증/인가 설정
//      - JWT Bearer 인증, 역할 기반 정책
//   3. 미들웨어 파이프라인
//      - CORS, 정적 파일, 라우팅, 인증, 압축
//   4. Windows 서비스 지원
//
// [설정 파일]
//   - appsettings.json: DB 연결, JWT, 이메일, 파일 저장 설정
//   - App:Urls: Kestrel 바인딩 URL (예: http://192.168.0.100:5000)
//
// [유지보수 가이드]
//   - 새 서비스 추가 시 builder.Services.Add... 사용
//   - 새 정책 추가 시 AddAuthorization 블록에서 추가
//   - 미들웨어 순서 변경 시 주의 (인증 → 인가 순서 유지)
// ============================================================================

using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using BnfErpPortal.Data;
using BnfErpPortal.Constants;
using Microsoft.Extensions.Hosting.WindowsServices;
using BnfErpPortal.Services;
using Microsoft.Extensions.FileProviders;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using BnfErpPortal.Hubs;

// ─────────────────────────────────────────────────────────────────────────────
// 애플리케이션 빌더 생성
// ─────────────────────────────────────────────────────────────────────────────
var options = new WebApplicationOptions
{
    Args = args,
    // Windows 서비스로 실행 시 ContentRootPath를 실행 파일 위치로 설정
    ContentRootPath = WindowsServiceHelpers.IsWindowsService()
        ? AppContext.BaseDirectory
        : null
};

var builder = WebApplication.CreateBuilder(options);

// Kestrel URL 바인딩 설정 (appsettings.json의 App:Urls)
var appUrls = builder.Configuration["App:Urls"];
if (!string.IsNullOrWhiteSpace(appUrls))
{
    builder.WebHost.UseUrls(appUrls);
}

// Windows 서비스 호스트 설정
builder.Host.UseWindowsService();

// ─────────────────────────────────────────────────────────────────────────────
// 서비스 등록 (DI Container)
// ─────────────────────────────────────────────────────────────────────────────

// HTTP 응답 압축 (Brotli/GZip)
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

// 기본 서비스 (JSON API 응답 시 null 값 제외하여 네트워크 전송량/Payload 절약)
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });
builder.Services.AddEndpointsApiExplorer();

// SignalR 추가
builder.Services.AddSignalR();

// Health Checks (서버 및 DB 상태 모니터링)
builder.Services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>("Database");

// Swagger 설정 (JWT 인증 지원)
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo 
    { 
        Title = "BnF ERP Portal API", 
        Version = "v1",
        Description = "비앤에프소프트 ERP 유지보수 포털 API"
    });
    
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

builder.Services.AddDbContextPool<ApplicationDbContext>(options =>
    options.UseMySql(
        connectionString,
        ServerVersion.AutoDetect(connectionString)));

// JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("JWT secret 'Jwt:Secret' is not configured.");
var key = Encoding.UTF8.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "BnfErpPortal",
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "BnfErpPortalUsers",
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
    
    // WebSockets(SignalR)을 위한 토큰 추출 설정
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            
            // "/hubs/" 경로로 시작하는 요청이면서 토큰이 있다면 추출
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization(options =>
{
    // 시스템 관리 권한 (시스템 관리자 / 매니저 / 엔지니어)
    // - 현재는 세 역할 모두 동일한 권한을 가지도록 설정
    // - 추후 역할별 권한을 분리하고 싶다면 이 블록만 수정하면 됩니다.
    options.AddPolicy(AuthorizationPolicies.AdminOnly, policy =>
        policy.RequireRole(UserRoles.Admin, UserRoles.Manager, UserRoles.Engineer));

    // 관리자 / 매니저 공통 관리 기능
    // - 현재는 시스템 관리 권한과 동일한 역할 집합을 사용
    options.AddPolicy(AuthorizationPolicies.AdminOrManager, policy =>
        policy.RequireRole(UserRoles.Admin, UserRoles.Manager, UserRoles.Engineer));

    // 내부 운영자 전체 (시스템 관리자 / 매니저 / 엔지니어)
    options.AddPolicy(AuthorizationPolicies.InternalStaff, policy =>
        policy.RequireRole(UserRoles.Admin, UserRoles.Manager, UserRoles.Engineer));
});

// Services
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddSingleton<IAuditLogService, AuditLogService>(); // Audit Log Service (Singleton for safe fire-and-forget logging)

// Memory Cache (이메일 설정 및 데이터 캐싱용)
builder.Services.AddMemoryCache();

// Rate Limiter (호출 속도 제한)
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("FixedWindow", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 30;      // 1분당 최대 30회 허용
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;        // 대기열 없이 즉각 429 반환
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Email Services (비동기 큐 방식)
builder.Services.AddSingleton<EmailQueueService>();
builder.Services.AddSingleton<IEmailQueueService>(sp => sp.GetRequiredService<EmailQueueService>());
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
builder.Services.AddScoped<IEmailService, QueuedEmailService>();
builder.Services.AddHostedService<EmailSenderBackgroundService>();

// RefreshToken 정리 서비스 (24시간마다 만료/폐기된 토큰 삭제)
builder.Services.AddHostedService<RefreshTokenCleanupService>();

builder.Services.AddScoped<IEmailTemplateService, EmailTemplateService>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(origin => 
        {
            // 로컬 IP 및 개발 환경 허용
            if (string.IsNullOrEmpty(origin)) return true;
            
            var uri = new Uri(origin);
            var host = uri.Host;
            
            // localhost, 127.0.0.1, 로컬 IP (192.168.x.x) 허용
            if (host == "localhost" || 
                host == "127.0.0.1" || 
                host.StartsWith("192.168.") ||
                host.StartsWith("10.") ||
                host.StartsWith("172."))
            {
                return true;
            }
            
            // 추후 도메인 추가 가능
            // if (host == "yourdomain.com") return true;
            
            return false;
        })
        .AllowAnyMethod()
        .AllowCredentials()   // Cookie 허용
        .SetPreflightMaxAge(TimeSpan.FromHours(24)); // 브라우저 OPTIONS(Preflight) 요청 캐싱 (네트워크 지연 시간, 외부 통신 부하 극적 절감)
    });
});

var app = builder.Build();

// Nginx, IIS 등 리버스 프록시 뒤에서 실행될 때 원래 도메인 및 프로토콜(Scheme, Host) 정보를 유지하기 위한 설정
// (비밀번호 재설정 링크 생성 시 Request.Host 가 localhost:5000 이 아닌 실제 도메인으로 잡히게 함)
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor | 
                       Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto |
                       Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedHost
});

// Response Compression 미들웨어는 가능한 빨리 적용
app.UseResponseCompression();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// 전역 예외 처리 (Global Exception Handler)
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";

        var exceptionHandlerPathFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();
        var exception = exceptionHandlerPathFeature?.Error;

        // 실제 운영 환경에서는 상세 에러(exception.Message, StackTrace 등)를 클라이언트에 노출하지 않고 로그 시스템(Serilog 등)에 기록합니다.
        var errorResponse = new { 
            error = "서버 내부 오류가 발생했습니다. 관리자에게 문의하세요.",
            // 개발 환경일 때만 상세 에러 메시지 반환 (옵션)
            details = app.Environment.IsDevelopment() ? exception?.Message : null
        };
        
        await context.Response.WriteAsJsonAsync(errorResponse);
    });
});

// 보안 헤더 추가
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "SAMEORIGIN";
    context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

    // SPA에서 업데이트 시 변경사항이 즉각 반영되도록 HTML 파일(index.html 등)에 대한 브라우저 자체 캐싱 방지 설정
    context.Response.OnStarting(() =>
    {
        var contentType = context.Response.ContentType;
        if (contentType != null && contentType.StartsWith("text/html", StringComparison.OrdinalIgnoreCase))
        {
            context.Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
            context.Response.Headers["Pragma"] = "no-cache";
            context.Response.Headers["Expires"] = "0";
            context.Response.Headers.Remove("ETag");
            context.Response.Headers.Remove("Last-Modified");
        }
        return Task.CompletedTask;
    });
    
    await next();
});

var staticFileOptions = new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        // .html 파일 (SPA 진입점)은 절대 캐시하지 않음
        if (ctx.File.Name.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
        {
            ctx.Context.Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
            ctx.Context.Response.Headers["Pragma"] = "no-cache";
            ctx.Context.Response.Headers["Expires"] = "0";
            ctx.Context.Response.Headers.Remove("ETag");
            ctx.Context.Response.Headers.Remove("Last-Modified");
        }
        // js, css 등 Vite 번들 파일명은 해시가 포함되어 있으므로 1년 캐시 (max-age=31536000) 유지 적용
        // 파일 내용이 변경(패치)되면 빌드 시 파일명 안의 해시 문구(예: index-XyZ12.js)가 자체적으로 교체되므로
        // 고객 브라우저는 옛날 파일 대신 항상 새 파일을 즉각적으로 요구하게 되는 원리(Cache Busting)입니다.
        else if (ctx.File.Name.EndsWith(".js") || ctx.File.Name.EndsWith(".css") || ctx.File.Name.EndsWith(".woff2") || ctx.File.Name.EndsWith(".png") || ctx.File.Name.EndsWith(".jpg") || ctx.File.Name.EndsWith(".svg"))
        {
            ctx.Context.Response.Headers["Cache-Control"] = "public, max-age=31536000, immutable";
            ctx.Context.Response.Headers.Remove("Pragma");
            ctx.Context.Response.Headers.Remove("Expires");
            // ETag와 Last-Modified는 유지하여 필요 시 조건부 요청도 원활하게 돌아가도록 둡니다.
        }
    }
};

app.UseStaticFiles(staticFileOptions);

// 에디터 본문 첨부용 이미지 정적 서빙 최적화 (권한 체크 무시, 완전 캐싱, 서버 부하 제로)
var uploadPath = builder.Configuration["FileStorage:UploadPath"] ?? "uploads";
var basePath = Path.IsPathRooted(uploadPath) 
    ? uploadPath 
    : Path.Combine(builder.Environment.ContentRootPath, uploadPath);
var inlineImagesPath = Path.Combine(basePath, "inline-images");

if (!Directory.Exists(inlineImagesPath))
{
    Directory.CreateDirectory(inlineImagesPath);
}

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(inlineImagesPath),
    RequestPath = "/inline-images",
    OnPrepareResponse = ctx =>
    {
        // 이미지 파일명은 예측 불가능한 GUID이므로 1년 캐시 보장
        ctx.Context.Response.Headers["Cache-Control"] = "public, max-age=31536000, immutable";
    }
});

app.UseCors("AllowAll");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

// 헬스 체크(Health Checks) 엔드포인트 노출 - 권한 불필요
app.MapHealthChecks("/api/health");

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

app.MapFallbackToFile("index.html", staticFileOptions);

app.Run();
