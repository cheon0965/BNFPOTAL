// ============================================================================
// 파일명: JwtService.cs
// 경로: Backend/Services/JwtService.cs
// 설명: JWT 토큰 관리 서비스 - Access Token 및 Refresh Token 생성/검증
// ----------------------------------------------------------------------------
// [설정 참조] appsettings.json의 Jwt 섹션
//   - Secret: 토큰 서명 키 (최소 256비트 권장)
//   - AccessTokenExpirationMinutes: Access Token 유효 시간 (기본 15분)
//   - RefreshTokenExpirationDays: Refresh Token 유효 시간 (기본 7일)
// [유지보수 가이드]
//   - 토큰 클레임 추가 시 GenerateAccessToken() 수정
//   - 보안 강화 시 ValidateToken() 파라미터 조정
// ============================================================================

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using BnfErpPortal.Data;
using BnfErpPortal.Models;

namespace BnfErpPortal.Services;

/// <summary>
/// JWT 서비스 인터페이스
/// </summary>
public interface IJwtService
{
    /// <summary>Access Token 생성</summary>
    string GenerateAccessToken(User user);
    
    /// <summary>Refresh Token 생성</summary>
    RefreshToken GenerateRefreshToken(User user, string ipAddress);
    
    /// <summary>Access Token 검증</summary>
    ClaimsPrincipal? ValidateToken(string token);
    
    /// <summary>Refresh Token 검증 (DB 조회)</summary>
    Task<RefreshToken?> ValidateRefreshTokenAsync(string token);
    
    /// <summary>Refresh Token 폐기</summary>
    Task RevokeRefreshTokenAsync(string token, string reason);
    
    /// <summary>사용자의 모든 Refresh Token 폐기</summary>
    Task RevokeAllUserTokensAsync(int userId, string reason);
}

/// <summary>
/// JWT 토큰 관리 서비스 구현
/// </summary>
/// <remarks>
/// <para>Access Token: 단기 유효, 클레임 기반 인증</para>
/// <para>Refresh Token: 장기 유효, DB 저장, Access Token 갱신용</para>
/// </remarks>
public class JwtService : IJwtService
{
    private readonly IConfiguration _configuration;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<JwtService> _logger;
    
    public JwtService(
        IConfiguration configuration, 
        ApplicationDbContext context,
        ILogger<JwtService> logger)
    {
        _configuration = configuration;
        _context = context;
        _logger = logger;
    }
    
    /// <summary>
    /// Access Token 생성
    /// </summary>
    /// <param name="user">토큰을 발급할 사용자</param>
    /// <returns>JWT 토큰 문자열</returns>
    /// <remarks>
    /// <para>포함 클레임: UserId, Email, Name, Role, CompanyId</para>
    /// <para>유효 시간: appsettings의 AccessTokenExpirationMinutes (기본 15분)</para>
    /// </remarks>
    public string GenerateAccessToken(User user)
    {
        var jwtSecret = _configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("JWT secret 'Jwt:Secret' is not configured.");
        
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        // 토큰에 포함할 클레임 정의
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),  // 사용자 ID
            new Claim(ClaimTypes.Email, user.Email),                        // 이메일
            new Claim(ClaimTypes.Name, user.Name),                          // 이름
            new Claim(ClaimTypes.Role, user.Role),                          // 역할
            new Claim("CompanyId", user.CompanyId?.ToString() ?? ""),       // 소속 회사
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),  // 토큰 고유 ID
            new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString())  // 발급 시간
        };
        
        var expirationMinutes = _configuration.GetValue<int>("Jwt:AccessTokenExpirationMinutes", 15);
        
        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "BnfErpPortal",
            audience: _configuration["Jwt:Audience"] ?? "BnfErpPortalUsers",
            claims: claims,
            expires: DateTime.Now.AddMinutes(expirationMinutes),
            signingCredentials: credentials
        );
        
        _logger.LogInformation("Access Token 생성: UserId={UserId}, Expiration={Expiration}분", user.UserId, expirationMinutes);
        
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
    
    /// <summary>
    /// Refresh Token 생성
    /// </summary>
    /// <param name="user">토큰을 발급할 사용자</param>
    /// <param name="ipAddress">요청 클라이언트 IP (보안 추적용)</param>
    /// <returns>RefreshToken 엔티티 (DB 저장 전)</returns>
    /// <remarks>유효 시간: appsettings의 RefreshTokenExpirationDays (기본 7일)</remarks>
    public RefreshToken GenerateRefreshToken(User user, string ipAddress)
    {
        // 64바이트 랜덤 토큰 생성
        var randomBytes = new byte[64];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomBytes);
        }
        
        var expirationDays = _configuration.GetValue<int>("Jwt:RefreshTokenExpirationDays", 7);
        
        var refreshToken = new RefreshToken
        {
            UserId = user.UserId,
            Token = Convert.ToBase64String(randomBytes),
            ExpiresAt = DateTime.Now.AddDays(expirationDays),
            CreatedAt = DateTime.Now,
            CreatedByIp = ipAddress,
            IsRevoked = false
        };
        
        _logger.LogInformation("Refresh Token 생성: UserId={UserId}, IP={IpAddress}", user.UserId, ipAddress);
        
        return refreshToken;
    }
    
    /// <summary>
    /// Access Token 검증
    /// </summary>
    /// <param name="token">검증할 JWT 토큰</param>
    /// <returns>유효하면 ClaimsPrincipal, 무효하면 null</returns>
    public ClaimsPrincipal? ValidateToken(string token)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var jwtSecret = _configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("JWT secret 'Jwt:Secret' is not configured.");
        var key = Encoding.UTF8.GetBytes(jwtSecret);
        
        try
        {
            var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _configuration["Jwt:Issuer"] ?? "BnfErpPortal",
                ValidateAudience = true,
                ValidAudience = _configuration["Jwt:Audience"] ?? "BnfErpPortalUsers",
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero  // 시간 오차 허용 안 함
            }, out _);
            
            return principal;
        }
        catch (SecurityTokenExpiredException)
        {
            _logger.LogWarning("만료된 토큰 검증 시도");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "토큰 검증 실패");
            return null;
        }
    }
    
    /// <summary>
    /// Refresh Token 검증 (DB 조회)
    /// </summary>
    /// <param name="token">검증할 Refresh Token</param>
    /// <returns>유효하면 RefreshToken 엔티티, 무효하면 null</returns>
    /// <remarks>만료, 폐기, 사용자 비활성화 여부 모두 확인</remarks>
    public async Task<RefreshToken?> ValidateRefreshTokenAsync(string token)
    {
        var refreshToken = await _context.RefreshTokens
            .Include(rt => rt.User)
                .ThenInclude(u => u.Company)
            .FirstOrDefaultAsync(rt => rt.Token == token);
        
        // 토큰 존재 여부 확인
        if (refreshToken == null)
        {
            _logger.LogWarning("존재하지 않는 Refresh Token 검증 시도");
            return null;
        }
        
        // 폐기 여부 확인
        if (refreshToken.IsRevoked)
        {
            _logger.LogWarning("폐기된 Refresh Token 사용 시도: TokenId={TokenId}", refreshToken.RefreshTokenId);
            return null;
        }
        
        // 만료 여부 확인
        if (refreshToken.ExpiresAt < DateTime.Now)
        {
            _logger.LogWarning("만료된 Refresh Token 사용 시도: TokenId={TokenId}", refreshToken.RefreshTokenId);
            return null;
        }
        
        // 사용자 활성화 상태 확인
        if (!refreshToken.User.IsActive)
        {
            _logger.LogWarning("비활성화된 사용자의 Refresh Token 사용 시도: UserId={UserId}", refreshToken.UserId);
            return null;
        }
        
        return refreshToken;
    }
    
    /// <summary>
    /// 특정 Refresh Token 폐기
    /// </summary>
    /// <param name="token">폐기할 토큰</param>
    /// <param name="reason">폐기 사유 (로그용)</param>
    /// <remarks>로그아웃 시 호출</remarks>
    public async Task RevokeRefreshTokenAsync(string token, string reason)
    {
        var refreshToken = await _context.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.Token == token);
        
        if (refreshToken == null || refreshToken.IsRevoked)
        {
            return;
        }
        
        refreshToken.IsRevoked = true;
        refreshToken.RevokedAt = DateTime.Now;
        refreshToken.RevokeReason = reason;
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Refresh Token 폐기: TokenId={TokenId}, Reason={Reason}", refreshToken.RefreshTokenId, reason);
    }
    
    /// <summary>
    /// 사용자의 모든 활성 Refresh Token 폐기
    /// </summary>
    /// <param name="userId">사용자 ID</param>
    /// <param name="reason">폐기 사유</param>
    /// <remarks>비밀번호 변경, 계정 정지 시 호출</remarks>
    public async Task RevokeAllUserTokensAsync(int userId, string reason)
    {
        var activeTokens = await _context.RefreshTokens
            .Where(rt => rt.UserId == userId && !rt.IsRevoked && rt.ExpiresAt > DateTime.Now)
            .ToListAsync();
        
        foreach (var token in activeTokens)
        {
            token.IsRevoked = true;
            token.RevokedAt = DateTime.Now;
            token.RevokeReason = reason;
        }
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("사용자의 모든 Refresh Token 폐기: UserId={UserId}, Count={Count}", userId, activeTokens.Count);
    }
}
