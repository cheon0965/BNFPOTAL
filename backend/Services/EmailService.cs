// ============================================================================
// 파일명: EmailService.cs
// 경로: Backend/Services/EmailService.cs
// 설명: 이메일 발송 서비스 - SMTP 발송 및 설정 캐싱
// ----------------------------------------------------------------------------
// [아키텍처]
//   Controller → IEmailService.SendAsync() → QueuedEmailService (큐 추가)
//                                                    ↓
//                EmailSenderBackgroundService → SmtpEmailSender (실제 SMTP 발송)
//
// [주요 클래스]
//   - IEmailService: 비동기 큐 기반 발송 인터페이스 (권장)
//   - QueuedEmailService: 큐에 추가만 하고 즉시 반환 (API 응답 속도 향상)
//   - IEmailSender: 실제 SMTP 발송 인터페이스 (내부용)
//   - SmtpEmailSender: 설정 캐싱 + SmtpClient 재사용으로 성능 최적화
//
// [설정 우선순위]
//   1. DB의 EmailSettings 테이블 (관리자 화면에서 설정)
//   2. appsettings.json의 Email 섹션 (DB 설정 없을 때 폴백)
//
// [유지보수 가이드]
//   - 설정 캐시 시간: 5분 (CacheDuration 상수)
//   - 설정 변경 시 EmailSettingsController에서 캐시 무효화 호출
//   - SmtpClient는 thread-safe하지 않으므로 lock 사용 필수
// ============================================================================

using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.EntityFrameworkCore;
using BnfErpPortal.Data;

namespace BnfErpPortal.Services;

/// <summary>
/// 이메일 발송 인터페이스 (비동기 큐 사용)
/// </summary>
public interface IEmailService
{
    /// <summary>
    /// 이메일을 큐에 추가 (즉시 반환, 백그라운드에서 발송)
    /// </summary>
    Task SendAsync(string to, string subject, string body);
}

/// <summary>
/// 실제 SMTP 발송을 수행하는 인터페이스 (내부용)
/// </summary>
public interface IEmailSender
{
    /// <summary>
    /// 이메일을 직접 동기적으로 발송
    /// </summary>
    Task SendDirectAsync(string to, string subject, string body);
}

/// <summary>
/// 이메일 설정 캐시 모델
/// </summary>
public record EmailSettingsCache(
    string Host,
    int Port,
    string User,
    string Password,
    string FromAddress,
    bool EnableSsl
);

/// <summary>
/// 비동기 큐를 사용하는 이메일 서비스 (권장)
/// </summary>
public class QueuedEmailService : IEmailService
{
    private readonly IEmailQueueService _queueService;
    private readonly ILogger<QueuedEmailService> _logger;

    public QueuedEmailService(IEmailQueueService queueService, ILogger<QueuedEmailService> logger)
    {
        _queueService = queueService;
        _logger = logger;
    }

    public async Task SendAsync(string to, string subject, string body)
    {
        await _queueService.QueueAsync(to, subject, body);
        _logger.LogDebug("이메일이 발송 큐에 추가됨: {To}", to);
    }
}

/// <summary>
/// 실제 SMTP 발송을 담당하는 서비스 (캐싱 적용)
/// </summary>
public class SmtpEmailSender : IEmailSender, IDisposable
{
    private readonly IConfiguration _configuration;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IMemoryCache _cache;
    private readonly ILogger<SmtpEmailSender> _logger;
    
    private const string CacheKey = "EmailSettings";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);
    
    // SmtpClient 재사용을 위한 객체 (thread-safe하지 않으므로 lock 사용)
    private SmtpClient? _smtpClient;
    private EmailSettingsCache? _lastSettings;
    private readonly object _clientLock = new();

    public SmtpEmailSender(
        IConfiguration configuration,
        IServiceScopeFactory scopeFactory,
        IMemoryCache cache,
        ILogger<SmtpEmailSender> logger)
    {
        _configuration = configuration;
        _scopeFactory = scopeFactory;
        _cache = cache;
        _logger = logger;
    }

    public async Task SendDirectAsync(string to, string subject, string body)
    {
        var settings = await GetCachedSettingsAsync();
        
        if (settings == null)
        {
            _logger.LogWarning("이메일 설정이 없어 발송을 건너뜁니다.");
            return;
        }

        using var message = new MailMessage(settings.FromAddress, to, subject, body)
        {
            SubjectEncoding = System.Text.Encoding.UTF8,
            BodyEncoding = System.Text.Encoding.UTF8,
            IsBodyHtml = true
        };

        try
        {
            var client = GetOrCreateSmtpClient(settings);
            await client.SendMailAsync(message);
            _logger.LogDebug("이메일 발송 성공: {To}", to);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "이메일 발송 실패: {To}", to);
            
            // 연결 오류 시 클라이언트 리셋
            lock (_clientLock)
            {
                _smtpClient?.Dispose();
                _smtpClient = null;
            }
        }
    }

    private SmtpClient GetOrCreateSmtpClient(EmailSettingsCache settings)
    {
        lock (_clientLock)
        {
            // 설정이 변경되었으면 클라이언트 재생성
            if (_smtpClient != null && _lastSettings != settings)
            {
                _smtpClient.Dispose();
                _smtpClient = null;
            }

            if (_smtpClient == null)
            {
                _smtpClient = new SmtpClient(settings.Host, settings.Port)
                {
                    EnableSsl = settings.EnableSsl,
                    Credentials = new NetworkCredential(settings.User, settings.Password),
                    // 연결 타임아웃 설정 (기본 100초 → 30초로 단축)
                    Timeout = 30000
                };
                _lastSettings = settings;
                _logger.LogDebug("새 SmtpClient 생성: {Host}:{Port}", settings.Host, settings.Port);
            }

            return _smtpClient;
        }
    }

    private async Task<EmailSettingsCache?> GetCachedSettingsAsync()
    {
        // 캐시에서 먼저 확인
        if (_cache.TryGetValue(CacheKey, out EmailSettingsCache? cached))
        {
            return cached;
        }

        // DB에서 조회
        EmailSettingsCache? settings = null;

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            
            var dbSettings = await context.EmailSettings.AsNoTracking().FirstOrDefaultAsync();
            
            if (dbSettings != null &&
                !string.IsNullOrWhiteSpace(dbSettings.Host) &&
                !string.IsNullOrWhiteSpace(dbSettings.User) &&
                !string.IsNullOrWhiteSpace(dbSettings.Password))
            {
                settings = new EmailSettingsCache(
                    dbSettings.Host,
                    dbSettings.Port > 0 ? dbSettings.Port : 25,
                    dbSettings.User,
                    dbSettings.Password,
                    string.IsNullOrWhiteSpace(dbSettings.FromAddress) ? dbSettings.User : dbSettings.FromAddress,
                    dbSettings.EnableSsl
                );
                _logger.LogDebug("DB에서 이메일 설정 로드됨: {Host}", settings.Host);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "DB에서 이메일 설정 조회 실패, appsettings.json 사용");
        }

        // DB 설정이 없으면 appsettings.json에서 조회
        if (settings == null)
        {
            var section = _configuration.GetSection("Email");
            var host = section["Host"];
            var user = section["User"];
            var password = section["Password"];

            if (!string.IsNullOrWhiteSpace(host) && 
                !string.IsNullOrWhiteSpace(user) && 
                !string.IsNullOrWhiteSpace(password))
            {
                int port = 25;
                if (int.TryParse(section["Port"], out var parsedPort))
                    port = parsedPort;

                bool enableSsl = true;
                if (bool.TryParse(section["EnableSsl"], out var parsedEnableSsl))
                    enableSsl = parsedEnableSsl;

                settings = new EmailSettingsCache(
                    host,
                    port,
                    user,
                    password,
                    section["From"] ?? user,
                    enableSsl
                );
                _logger.LogDebug("appsettings.json에서 이메일 설정 로드됨: {Host}", host);
            }
        }

        // 캐시에 저장 (설정이 없어도 null로 저장하여 반복 조회 방지)
        if (settings != null)
        {
            _cache.Set(CacheKey, settings, CacheDuration);
        }
        else
        {
            // 설정이 없는 경우 짧은 시간만 캐시 (1분)
            _cache.Set<EmailSettingsCache?>(CacheKey, null, TimeSpan.FromMinutes(1));
        }

        return settings;
    }

    public void Dispose()
    {
        lock (_clientLock)
        {
            _smtpClient?.Dispose();
            _smtpClient = null;
        }
    }
}