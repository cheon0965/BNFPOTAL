// ============================================================================
// 파일명: UsersController.cs
// 경로: Backend/Controllers/UsersController.cs
// 설명: 사용자 관리 API 컨트롤러 - 사용자 CRUD (관리자용)
// ----------------------------------------------------------------------------
// [API 엔드포인트]
//   GET    /api/users              - 사용자 목록 조회 (필터링, 페이징)
//   GET    /api/users/{id}         - 사용자 상세 조회
//   PUT    /api/users/{id}         - 사용자 정보 수정
//   DELETE /api/users/{id}         - 사용자 삭제
//   GET    /api/users/internal     - 내부 사용자 목록 (담당자 배정용)
//
// [권한]
//   - 모든 API: 내부 사용자만 접근 가능 (AdminOnly 정책)
//   - 사용자 본인의 프로필 수정은 AuthController에서 처리
//
// [유지보수 가이드]
//   - 비밀번호 초기화 기능 추가 시 이 컨트롤러에 구현
//   - 역할 변경은 내부 사용자에 대해서만 허용
// ============================================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BnfErpPortal.Constants;
using BnfErpPortal.Data;
using BnfErpPortal.DTOs;
using BnfErpPortal.Models;
using BnfErpPortal.Services;

namespace BnfErpPortal.Controllers;

/// <summary>
/// 사용자 관리 API 컨트롤러 (관리자용)
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = AuthorizationPolicies.AdminOnly)]
public class UsersController : BaseController
{
    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IEmailTemplateService _emailTemplateService;
    private readonly ILogger<UsersController> _logger;
    private readonly IAuditLogService _auditLogService;
    private readonly IJwtService _jwtService;
    
    public UsersController(
        ApplicationDbContext context,
        IEmailService emailService,
        IEmailTemplateService emailTemplateService,
        ILogger<UsersController> logger,
        IAuditLogService auditLogService,
        IJwtService jwtService)
    {
        _context = context;
        _emailService = emailService;
        _emailTemplateService = emailTemplateService;
        _logger = logger;
        _auditLogService = auditLogService;
        _jwtService = jwtService;
    }
    
    #region 조회 API
    
    /// <summary>
    /// 사용자 목록 조회
    /// </summary>
    /// <param name="companyId">회사 ID 필터</param>
    /// <param name="role">역할 필터</param>
    /// <param name="search">검색어 (이름, 이메일)</param>
    /// <returns>사용자 목록</returns>
    [HttpGet]
    public async Task<ActionResult<List<UserListDto>>> GetUsers(
        [FromQuery] int? companyId,
        [FromQuery] string? role,
        [FromQuery] string? search)
    {
        var query = _context.Users
            .AsNoTracking()
            .Include(u => u.Company)
            .AsQueryable();
        
        // 필터 적용
        if (companyId.HasValue)
            query = query.Where(u => u.CompanyId == companyId.Value);
        
        if (!string.IsNullOrEmpty(role))
            query = query.Where(u => u.Role == role);
        
        if (!string.IsNullOrEmpty(search))
            query = query.Where(u => u.Name.Contains(search) || u.Email.Contains(search));
        
        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new UserListDto
            {
                UserId = u.UserId,
                Email = u.Email,
                Name = u.Name,
                PhoneNumber = u.PhoneNumber,
                Role = u.Role,
                CompanyId = u.CompanyId,
                CompanyName = u.Company != null ? u.Company.Name : null,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt,
                LastLoginAt = u.LastLoginAt
            })
            .ToListAsync();
        
        return Ok(users);
    }
    
    /// <summary>
    /// 사용자 상세 조회
    /// </summary>
    /// <param name="id">사용자 ID</param>
    [HttpGet("{id}")]
    public async Task<ActionResult<UserListDto>> GetUser(int id)
    {
        var user = await _context.Users
            .AsNoTracking()
            .Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.UserId == id);
        
        if (user == null)
            return NotFound();
        
        return Ok(new UserListDto
        {
            UserId = user.UserId,
            Email = user.Email,
            Name = user.Name,
            PhoneNumber = user.PhoneNumber,
            Role = user.Role,
            CompanyId = user.CompanyId,
            CompanyName = user.Company?.Name,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt
        });
    }
    
    /// <summary>
    /// 내부 사용자 목록 조회 (담당자 배정용)
    /// </summary>
    /// <returns>ADMIN, MANAGER, ENGINEER 역할 사용자</returns>
    [HttpGet("internal")]
    public async Task<ActionResult<List<UserListDto>>> GetInternalUsers()
    {
        var users = await _context.Users
            .AsNoTracking()
            .Include(u => u.Company)
            .Where(u => UserRoles.InternalRoles.Contains(u.Role) && u.IsActive)
            .OrderBy(u => u.Name)
            .Select(u => new UserListDto
            {
                UserId = u.UserId,
                Email = u.Email,
                Name = u.Name,
                Role = u.Role,
                CompanyId = u.CompanyId,
                CompanyName = u.Company != null ? u.Company.Name : null,
                IsActive = u.IsActive
            })
            .ToListAsync();
        
        return Ok(users);
    }
    
    #endregion

    #region 수정/삭제 API
    
    /// <summary>
    /// 사용자 정보 수정
    /// </summary>
    /// <param name="id">사용자 ID</param>
    /// <param name="request">수정 요청</param>
    /// <remarks>역할 변경은 AdminOnly</remarks>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound();
        
        // Partial Update
        if (request.Name != null)
            user.Name = request.Name;
        
        if (request.PhoneNumber != null)
            user.PhoneNumber = request.PhoneNumber;
        
        // 역할 변경: 유효성 검사
        if (request.Role != null)
        {
            if (!UserRoles.IsValid(request.Role))
                return BadRequest(new { message = "유효하지 않은 역할입니다." });
            user.Role = request.Role;
        }
        
        if (request.IsActive.HasValue)
            user.IsActive = request.IsActive.Value;
        
        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "USER", id, "UPDATE", null, $"Role: {user.Role}, IsActive: {user.IsActive}");
        
        return NoContent();
    }
    
    /// <summary>
    /// 사용자 삭제
    /// </summary>
    /// <param name="id">사용자 ID</param>
    /// <remarks>생성한 요청/댓글이 있으면 삭제 불가</remarks>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound();
        
        // 생성한 요청 존재 여부 확인
        if (await _context.Requests.AnyAsync(r => r.CreatedByUserId == id))
            return BadRequest(new { message = "요청을 생성한 사용자는 삭제할 수 없습니다." });
        
        // 작성한 댓글 존재 여부 확인
        if (await _context.RequestComments.AnyAsync(c => c.UserId == id))
            return BadRequest(new { message = "댓글을 작성한 사용자는 삭제할 수 없습니다." });
        
        _context.Users.Remove(user);
        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "USER", id, "DELETE", null, $"Email: {user.Email}");
        
        return NoContent();
    }
    
    /// <summary>
    /// 사용자 비밀번호 초기화 (토큰 기반 재설정 링크 발송)
    /// </summary>
    /// <param name="id">사용자 ID</param>
    /// <remarks>
    /// 1. 보안 토큰 생성 (24시간 유효)
    /// 2. 해당 사용자의 모든 세션(Refresh Token) 폐기 → 강제 로그아웃
    /// 3. 비밀번호 재설정 링크 이메일 발송
    /// </remarks>
    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = "사용자를 찾을 수 없습니다." });
        
        // 1. 기존 미사용 토큰 무효화
        var existingTokens = await _context.PasswordResetTokens
            .Where(t => t.UserId == id && !t.IsUsed && t.ExpiresAt > DateTime.Now)
            .ToListAsync();
        foreach (var t in existingTokens)
        {
            t.IsUsed = true;
            t.UsedAt = DateTime.Now;
        }
        
        // 2. 새 보안 토큰 생성 (24시간 유효)
        var resetToken = new PasswordResetToken
        {
            UserId = id,
            Token = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.Now.AddHours(24),
            IsUsed = false,
            CreatedAt = DateTime.Now
        };
        _context.PasswordResetTokens.Add(resetToken);
        await _context.SaveChangesAsync();
        
        // 3. 해당 사용자의 모든 Refresh Token 폐기 (강제 로그아웃)
        await _jwtService.RevokeAllUserTokensAsync(id, "관리자에 의한 비밀번호 초기화");
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "USER", id, "PASSWORD_RESET", null, "비밀번호 재설정 링크 발송");
        
        _logger.LogInformation("비밀번호 재설정 토큰 생성: UserId={UserId}, Email={Email}", user.UserId, user.Email);
        
        // 4. 재설정 링크 이메일 발송
        try
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var resetLink = $"{baseUrl}/reset-password?token={resetToken.Token}";
            
            var data = new Dictionary<string, string>
            {
                ["UserName"] = user.Name,
                ["ResetLink"] = resetLink
            };
            
            var (subject, body) = await _emailTemplateService.RenderAsync("USER_PASSWORD_RESET", data);
            
            if (!string.IsNullOrWhiteSpace(subject) && !string.IsNullOrWhiteSpace(body))
            {
                await _emailService.SendAsync(user.Email, subject, body);
                _logger.LogInformation("비밀번호 재설정 이메일 발송 완료: {Email}", user.Email);
            }
            else
            {
                _logger.LogWarning("USER_PASSWORD_RESET 이메일 템플릿이 없거나 비어있습니다.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "비밀번호 재설정 이메일 발송 실패: {Email}", user.Email);
        }
        
        return Ok(new { message = "비밀번호 재설정 링크를 사용자 이메일로 발송했습니다." });
    }
    
    #endregion
}
