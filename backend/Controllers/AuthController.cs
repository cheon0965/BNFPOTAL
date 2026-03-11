// ============================================================================
// 파일명: AuthController.cs
// 경로: Backend/Controllers/AuthController.cs
// 설명: 인증/인가 API 컨트롤러 - 로그인, 회원가입, 토큰 관리
// ----------------------------------------------------------------------------
// [API 엔드포인트]
//   POST /api/auth/login          - 로그인 (Access Token + Refresh Token 발급)
//   POST /api/auth/register       - 회원가입 (등록 코드 필요)
//   POST /api/auth/refresh-token  - Access Token 갱신
//   POST /api/auth/logout         - 로그아웃 (Refresh Token 폐기)
//   GET  /api/auth/me             - 현재 사용자 정보 조회
//   PUT  /api/auth/profile        - 프로필 수정
//   PUT  /api/auth/change-password - 비밀번호 변경
//
// [인증 방식]
//   - Access Token: JWT, 15분 유효, Authorization 헤더로 전송
//   - Refresh Token: 7일 유효, HttpOnly Cookie로 관리
//
// [유지보수 가이드]
//   - 토큰 유효 시간 변경: appsettings.json의 Jwt 섹션
//   - 새 인증 관련 API 추가 시 이 컨트롤러에 정의
// ============================================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BnfErpPortal.Data;
using BnfErpPortal.DTOs;
using BnfErpPortal.Models;
using BnfErpPortal.Services;

namespace BnfErpPortal.Controllers;

/// <summary>
/// 인증/인가 관련 API 컨트롤러
/// </summary>
/// <remarks>
/// <para>로그인, 회원가입, 토큰 갱신, 프로필 관리 기능 제공</para>
/// <para>Refresh Token은 HttpOnly Cookie로 관리하여 XSS 공격 방지</para>
/// </remarks>
[Route("api/[controller]")]
public class AuthController : BaseController
{
    private readonly ApplicationDbContext _context;
    private readonly IJwtService _jwtService;
    private readonly ILogger<AuthController> _logger;
    private readonly IAuditLogService _auditLogService;
    
    public AuthController(
        ApplicationDbContext context, 
        IJwtService jwtService,
        ILogger<AuthController> logger,
        IAuditLogService auditLogService)
    {
        _context = context;
        _jwtService = jwtService;
        _logger = logger;
        _auditLogService = auditLogService;
    }
    
    #region 로그인/로그아웃
    
    /// <summary>
    /// 로그인 - 이메일/비밀번호 검증 후 토큰 발급
    /// </summary>
    /// <param name="request">이메일, 비밀번호</param>
    /// <returns>Access Token 및 사용자 정보</returns>
    /// <remarks>Refresh Token은 HttpOnly Cookie로 자동 설정됨</remarks>
    [HttpPost("login")]
    [EnableRateLimiting("FixedWindow")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        var user = await _context.Users
            .Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive);
        
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            _logger.LogWarning("로그인 실패: Email={Email}", request.Email);
            return Unauthorized(new { message = "이메일 또는 비밀번호가 올바르지 않습니다." });
        }
        
        // 마지막 로그인 시간 업데이트
        user.LastLoginAt = DateTime.Now;
        await _context.SaveChangesAsync();
        
        // Access Token 생성 (15분)
        var accessToken = _jwtService.GenerateAccessToken(user);
        
        // Refresh Token 생성 (7일)
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
        var refreshToken = _jwtService.GenerateRefreshToken(user, ipAddress);
        
        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync();
        
        // Refresh Token을 HttpOnly Cookie에 저장
        SetRefreshTokenCookie(refreshToken.Token, refreshToken.ExpiresAt);
        
        _logger.LogInformation("로그인 성공: UserId={UserId}, Email={Email}", user.UserId, user.Email);
        await _auditLogService.LogActionAsync(user.UserId, "AUTH", user.UserId, "LOGIN_SUCCESS", "N/A", "N/A");
        
        return Ok(new AuthResponse
        {
            User = new UserDto
            {
                UserId = user.UserId,
                Email = user.Email,
                Name = user.Name,
                PhoneNumber = user.PhoneNumber,
                Role = user.Role,
                CompanyId = user.CompanyId,
                CompanyName = user.Company?.Name
            },
            Token = accessToken
        });
    }
    
    [HttpPost("register")]
    [EnableRateLimiting("FixedWindow")]
    // Register 액션 - 등록 코드 유효성을 검사한 뒤 새 고객 사용자를 생성하고 초기 정보를 저장합니다.
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        // Validate registration code
        var regCode = await _context.RegistrationCodes
            .Include(r => r.Company)
            .FirstOrDefaultAsync(r => r.Code == request.RegistrationCode && r.IsActive);
        
        if (regCode == null)
        {
            return BadRequest(new { message = "유효하지 않은 등록 코드입니다." });
        }
        
        // Check if code is expired
        if (regCode.ExpiresAt.HasValue && regCode.ExpiresAt.Value < DateTime.Now)
        {
            return BadRequest(new { message = "만료된 등록 코드입니다." });
        }
        
        // Check if code has reached max uses
        if (regCode.MaxUses.HasValue && regCode.UsedCount >= regCode.MaxUses.Value)
        {
            return BadRequest(new { message = "사용 횟수가 초과된 등록 코드입니다." });
        }
        
        // Check if company is active
        if (!regCode.Company.IsActive)
        {
            return BadRequest(new { message = "비활성화된 회사의 등록 코드입니다." });
        }
        
        // Check if email already exists
        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
        {
            return BadRequest(new { message = "이미 사용 중인 이메일입니다." });
        }
        
        // Create user
        var user = new User
        {
            CompanyId = regCode.CompanyId,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Name = request.Name,
            PhoneNumber = request.PhoneNumber,
            Role = regCode.RoleDefault,
            IsActive = regCode.UserIsActiveDefault,
            CreatedAt = DateTime.Now
        };
        
        _context.Users.Add(user);
        
        // Increment used count
        regCode.UsedCount++;
        regCode.UpdatedAt = DateTime.Now;
        
        await _context.SaveChangesAsync();
        
        // Access Token 생성
        var accessToken = _jwtService.GenerateAccessToken(user);
        
        // Refresh Token 생성
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
        var refreshToken = _jwtService.GenerateRefreshToken(user, ipAddress);
        
        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync();
        
        // Refresh Token을 HttpOnly Cookie에 저장
        SetRefreshTokenCookie(refreshToken.Token, refreshToken.ExpiresAt);
        
        _logger.LogInformation("회원가입 성공: UserId={UserId}, Email={Email}", user.UserId, user.Email);
        
        return Ok(new AuthResponse
        {
            User = new UserDto
            {
                UserId = user.UserId,
                Email = user.Email,
                Name = user.Name,
                PhoneNumber = user.PhoneNumber,
                Role = user.Role,
                CompanyId = user.CompanyId,
                CompanyName = regCode.Company.Name
            },
            Token = accessToken
        });
    }
    
    [HttpPost("registration-codes/validate")]
    // ValidateCode 액션 - 회원가입 시 사용하는 회사 등록 코드가 유효한지 확인합니다.
    public async Task<ActionResult<ValidateCodeResponse>> ValidateCode([FromBody] ValidateCodeRequest request)
    {
        var regCode = await _context.RegistrationCodes
            .Include(r => r.Company)
            .FirstOrDefaultAsync(r => r.Code == request.Code && r.IsActive);
        
        if (regCode == null)
        {
            return Ok(new ValidateCodeResponse
            {
                IsValid = false,
                Message = "유효하지 않은 등록 코드입니다."
            });
        }
        
        if (regCode.ExpiresAt.HasValue && regCode.ExpiresAt.Value < DateTime.Now)
        {
            return Ok(new ValidateCodeResponse
            {
                IsValid = false,
                Message = "만료된 등록 코드입니다."
            });
        }
        
        if (regCode.MaxUses.HasValue && regCode.UsedCount >= regCode.MaxUses.Value)
        {
            return Ok(new ValidateCodeResponse
            {
                IsValid = false,
                Message = "사용 횟수가 초과된 등록 코드입니다."
            });
        }
        
        if (!regCode.Company.IsActive)
        {
            return Ok(new ValidateCodeResponse
            {
                IsValid = false,
                Message = "비활성화된 회사의 등록 코드입니다."
            });
        }
        
        return Ok(new ValidateCodeResponse
        {
            IsValid = true,
            CompanyName = regCode.Company.Name
        });
    }
    
    // 현재 사용자 정보 조회
    [HttpGet("me")]
    [Authorize]
    // GetCurrentUser 액션 - 현재 로그인한 사용자의 상세 정보를 조회합니다.
    public async Task<ActionResult<UserDto>> GetCurrentUser()
    {
        var userId = GetCurrentUserId();
        var user = await _context.Users
            .Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.UserId == userId);
        
        if (user == null)
            return NotFound();
        
        return Ok(new UserDto
        {
            UserId = user.UserId,
            Email = user.Email,
            Name = user.Name,
            PhoneNumber = user.PhoneNumber,
            Role = user.Role,
            CompanyId = user.CompanyId,
            CompanyName = user.Company?.Name
        });
    }
    
    // 프로필 수정
    [HttpPut("profile")]
    [Authorize]
    // UpdateProfile 액션 - 현재 로그인한 사용자의 이름, 연락처 등 프로필 정보를 수정합니다.
    public async Task<ActionResult<UserDto>> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = GetCurrentUserId();
        var user = await _context.Users
            .Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.UserId == userId);
        
        if (user == null)
            return NotFound();
        
        // 이름 변경
        if (!string.IsNullOrEmpty(request.Name))
            user.Name = request.Name;
        
        // 이메일 변경 (중복 체크)
        if (!string.IsNullOrEmpty(request.Email) && request.Email != user.Email)
        {
            if (await _context.Users.AnyAsync(u => u.Email == request.Email && u.UserId != userId))
                return BadRequest(new { message = "이미 사용 중인 이메일입니다." });
            user.Email = request.Email;
        }
        
        // 전화번호 변경
        if (request.PhoneNumber != null)
            user.PhoneNumber = request.PhoneNumber;
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("프로필 수정: UserId={UserId}", userId);
        
        return Ok(new UserDto
        {
            UserId = user.UserId,
            Email = user.Email,
            Name = user.Name,
            PhoneNumber = user.PhoneNumber,
            Role = user.Role,
            CompanyId = user.CompanyId,
            CompanyName = user.Company?.Name
        });
    }
    
    // 비밀번호 변경
    [HttpPut("password")]
    [Authorize]
    // ChangePassword 액션 - 기존 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다.
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = GetCurrentUserId();
        var user = await _context.Users.FindAsync(userId);
        
        if (user == null)
            return NotFound();
        
        // 현재 비밀번호 확인
        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "현재 비밀번호가 올바르지 않습니다." });
        
        // 새 비밀번호 길이 검증
        if (string.IsNullOrEmpty(request.NewPassword) || request.NewPassword.Length < 8)
            return BadRequest(new { message = "새 비밀번호는 8자 이상이어야 합니다." });
        
        // 비밀번호 변경
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _context.SaveChangesAsync();
        
        // 보안을 위해 모든 디바이스에서 로그아웃
        await _jwtService.RevokeAllUserTokensAsync(userId, "비밀번호 변경으로 인한 보안 조치");
        
        _logger.LogInformation("비밀번호 변경: UserId={UserId}", userId);
        
        return Ok(new { message = "비밀번호가 변경되었습니다. 보안을 위해 모든 디바이스에서 로그아웃되었습니다." });
    }
    
    [HttpPost("refresh")]
    [EnableRateLimiting("FixedWindow")]
    // Refresh 액션 - Refresh Token으로 Access Token을 갱신합니다.
    public async Task<ActionResult<AuthResponse>> RefreshToken()
    {
        var refreshTokenValue = Request.Cookies["refreshToken"];
        
        if (string.IsNullOrEmpty(refreshTokenValue))
        {
            _logger.LogWarning("Refresh Token이 Cookie에 없음");
            return Unauthorized(new { message = "Refresh Token이 없습니다." });
        }
        
        var refreshToken = await _jwtService.ValidateRefreshTokenAsync(refreshTokenValue);
        
        if (refreshToken == null)
        {
            _logger.LogWarning("유효하지 않은 Refresh Token 사용 시도");
            Response.Cookies.Delete("refreshToken");
            return Unauthorized(new { message = "유효하지 않은 Refresh Token입니다." });
        }
        
        var user = refreshToken.User;
        
        // 기존 Refresh Token 폐기
        await _jwtService.RevokeRefreshTokenAsync(refreshTokenValue, "새 토큰으로 교체됨");
        
        // 새 Access Token 생성
        var newAccessToken = _jwtService.GenerateAccessToken(user);
        
        // 새 Refresh Token 생성
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
        var newRefreshToken = _jwtService.GenerateRefreshToken(user, ipAddress);
        
        _context.RefreshTokens.Add(newRefreshToken);
        await _context.SaveChangesAsync();
        
        // 새 Refresh Token을 Cookie에 저장
        SetRefreshTokenCookie(newRefreshToken.Token, newRefreshToken.ExpiresAt);
        
        _logger.LogInformation("Token Refresh 성공: UserId={UserId}", user.UserId);
        
        return Ok(new AuthResponse
        {
            User = new UserDto
            {
                UserId = user.UserId,
                Email = user.Email,
                Name = user.Name,
                PhoneNumber = user.PhoneNumber,
                Role = user.Role,
                CompanyId = user.CompanyId,
                CompanyName = user.Company?.Name
            },
            Token = newAccessToken
        });
    }
    
    [HttpPost("logout")]
    [Authorize]
    // Logout 액션 - Refresh Token을 폐기하고 로그아웃합니다.
    public async Task<IActionResult> Logout()
    {
        var refreshTokenValue = Request.Cookies["refreshToken"];
        
        if (!string.IsNullOrEmpty(refreshTokenValue))
        {
            await _jwtService.RevokeRefreshTokenAsync(refreshTokenValue, "사용자 로그아웃");
        }
        
        Response.Cookies.Delete("refreshToken");
        
        var userId = GetCurrentUserId();
        _logger.LogInformation("로그아웃: UserId={UserId}", userId);
        if (userId > 0)
        {
            await _auditLogService.LogActionAsync(userId, "AUTH", userId, "LOGOUT", "N/A", "N/A");
        }
        
        return Ok(new { message = "로그아웃되었습니다." });
    }
    
    [HttpPost("logout-all")]
    [Authorize]
    // LogoutAll 액션 - 사용자의 모든 Refresh Token을 폐기합니다.
    public async Task<IActionResult> LogoutAll()
    {
        var userId = GetCurrentUserId();
        
        await _jwtService.RevokeAllUserTokensAsync(userId, "사용자가 모든 디바이스에서 로그아웃");
        
        Response.Cookies.Delete("refreshToken");
        
        _logger.LogInformation("전체 로그아웃: UserId={UserId}", userId);
        
        return Ok(new { message = "모든 디바이스에서 로그아웃되었습니다." });
    }
    
    /// <summary>
    /// 비밀번호 재설정 토큰 유효성 검증
    /// </summary>
    /// <remarks>비로그인 상태에서 접근 가능</remarks>
    [AllowAnonymous]
    [HttpPost("validate-reset-token")]
    [EnableRateLimiting("FixedWindow")]
    public async Task<IActionResult> ValidateResetToken([FromBody] ValidateResetTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
            return Ok(new { isValid = false, errorType = "INVALID" });
        
        var token = await _context.PasswordResetTokens
            .FirstOrDefaultAsync(t => t.Token == request.Token);
        
        if (token == null)
            return Ok(new { isValid = false, errorType = "INVALID" });
        
        if (token.IsUsed)
            return Ok(new { isValid = false, errorType = "USED" });
        
        if (token.ExpiresAt <= DateTime.Now)
            return Ok(new { isValid = false, errorType = "EXPIRED" });
        
        return Ok(new { isValid = true, errorType = (string?)null });
    }
    
    /// <summary>
    /// 비밀번호 재설정 (토큰 + 새 비밀번호)
    /// </summary>
    /// <remarks>비로그인 상태에서 접근 가능</remarks>
    [AllowAnonymous]
    [HttpPost("reset-password")]
    [EnableRateLimiting("FixedWindow")]
    public async Task<IActionResult> ResetPasswordWithToken([FromBody] ResetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.NewPassword))
            return BadRequest(new { message = "토큰과 새 비밀번호를 입력해 주세요." });
        
        if (request.NewPassword.Length < 8)
            return BadRequest(new { message = "비밀번호는 8자 이상이어야 합니다." });
        
        var token = await _context.PasswordResetTokens
            .FirstOrDefaultAsync(t => t.Token == request.Token);
        
        if (token == null)
            return BadRequest(new { message = "유효하지 않은 링크입니다.", errorType = "INVALID" });
        
        if (token.IsUsed)
            return BadRequest(new { message = "이미 사용된 링크입니다.", errorType = "USED" });
        
        if (token.ExpiresAt <= DateTime.Now)
            return BadRequest(new { message = "비밀번호 재설정 링크가 만료되었습니다.", errorType = "EXPIRED" });
        
        // 비밀번호 변경
        var user = await _context.Users.FindAsync(token.UserId);
        if (user == null)
            return BadRequest(new { message = "사용자를 찾을 수 없습니다." });
        
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        
        // 토큰 사용 처리
        token.IsUsed = true;
        token.UsedAt = DateTime.Now;
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("비밀번호 재설정 완료: UserId={UserId}, Email={Email}", user.UserId, user.Email);
        
        return Ok(new { message = "비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해 주세요." });
    }
    
    // SetRefreshTokenCookie 메서드 - HttpOnly Cookie에 Refresh Token 저장
    private void SetRefreshTokenCookie(string token, DateTime expiresAt)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,  // HTTPS 요청 시에만 Secure 속성 자동 활성화
            SameSite = SameSiteMode.Lax,  // 로컬 개발 환경 고려
            Expires = expiresAt
        };
        
        Response.Cookies.Append("refreshToken", token, cookieOptions);
    }

    #endregion
}

public class ValidateCodeRequest
{
    public string Code { get; set; } = string.Empty;
}

public class ValidateResetTokenRequest
{
    public string Token { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    public string Token { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
