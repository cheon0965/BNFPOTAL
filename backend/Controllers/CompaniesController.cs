// ============================================================================
// 파일명: CompaniesController.cs
// 경로: Backend/Controllers/CompaniesController.cs
// 설명: 회사 관리 API 컨트롤러 - 고객사 CRUD
// ----------------------------------------------------------------------------
// [API 엔드포인트]
//   GET    /api/companies              - 회사 목록 조회
//   GET    /api/companies/{id}         - 회사 상세 조회
//   POST   /api/companies              - 회사 생성 (ADMIN만)
//   PUT    /api/companies/{id}         - 회사 수정 (ADMIN만)
//   DELETE /api/companies/{id}         - 회사 삭제 (ADMIN만)
//   GET    /api/companies/{id}/erp-systems - 회사별 ERP 시스템 목록
//
// [권한]
//   - 목록/상세 조회: 내부 사용자 (AdminOrManager 정책)
//   - 생성/수정/삭제: 관리자만 (AdminOnly 정책)
//
// [주의사항]
//   - 비앤에프소프트(CompanyId=1)는 삭제 불가
//   - 사용자/요청이 있는 회사는 삭제 불가
// ============================================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using BnfErpPortal.Data;
using BnfErpPortal.DTOs;
using BnfErpPortal.Models;
using BnfErpPortal.Constants;
using BnfErpPortal.Services;
using Microsoft.Extensions.Caching.Memory;

namespace BnfErpPortal.Controllers;

/// <summary>
/// 회사 관리 API 컨트롤러
/// </summary>
/// <remarks>고객사 CRUD 및 관련 ERP 시스템 조회 기능 제공</remarks>
[ApiController]
[Route("api/[controller]")]
public class CompaniesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;
    private readonly IMemoryCache _cache;
    
    private const string CompaniesCacheKey = "CompanyListCache";
    
    public CompaniesController(ApplicationDbContext context, IAuditLogService auditLogService, IMemoryCache cache)
    {
        _context = context;
        _auditLogService = auditLogService;
        _cache = cache;
    }
    
    private int GetCurrentUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
    
    #region 조회 API
    
    /// <summary>
    /// 내 회사 정보 조회 (모든 인증된 사용자)
    /// </summary>
    /// <returns>현재 로그인한 사용자의 회사 정보</returns>
    [HttpGet("my")]
    [Authorize]
    public async Task<ActionResult<CompanyDto>> GetMyCompany()
    {
        var userId = GetCurrentUserId();
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return NotFound();
        
        var company = await _context.Companies
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.CompanyId == user.CompanyId);
        
        if (company == null)
            return NotFound();
        
        return Ok(new CompanyDto
        {
            CompanyId = company.CompanyId,
            Name = company.Name,
            Code = company.Code,
            PhoneNumber = company.PhoneNumber,
            IsActive = company.IsActive,
            CreatedAt = company.CreatedAt
        });
    }
    
    /// <summary>
    /// 회사 목록 조회
    /// </summary>
    /// <param name="search">검색어 (이름, 코드)</param>
    /// <returns>회사 목록 (사용자 수, 요청 수 포함)</returns>
    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.AdminOrManager)]
    public async Task<ActionResult<List<CompanyDto>>> GetCompanies([FromQuery] string? search)
    {
        // 검색어가 있으면 캐시를 타지 않거나 별도 캐시 키를 써야 함. 여기서는 검색어가 없을 때만 전체 캐싱 동작.
        if (string.IsNullOrEmpty(search))
        {
            if (_cache.TryGetValue(CompaniesCacheKey, out List<CompanyDto>? cachedCompanies))
            {
                return Ok(cachedCompanies);
            }
        }

        var query = _context.Companies.AsNoTracking().AsQueryable();
        
        // 검색어 필터링
        if (!string.IsNullOrEmpty(search))
            query = query.Where(c => c.Name.Contains(search) || c.Code.Contains(search));
        
        var companies = await query
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new CompanyDto
            {
                CompanyId = c.CompanyId,
                Name = c.Name,
                Code = c.Code,
                PhoneNumber = c.PhoneNumber,
                IsActive = c.IsActive,
                UsersCount = c.Users.Count,
                RequestsCount = c.Requests.Count,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();
        
        // 검색어가 없을 때만 메모리 캐시에 저장 (최대 1시간 보관)
        if (string.IsNullOrEmpty(search))
        {
            var cacheOptions = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(TimeSpan.FromHours(1))
                .SetSlidingExpiration(TimeSpan.FromMinutes(15));
            _cache.Set(CompaniesCacheKey, companies, cacheOptions);
        }
        
        return Ok(companies);
    }
    
    /// <summary>
    /// 회사 상세 조회
    /// </summary>
    /// <param name="id">회사 ID</param>
    /// <returns>회사 상세 정보</returns>
    [HttpGet("{id}")]
    [Authorize(Policy = AuthorizationPolicies.AdminOrManager)]
    public async Task<ActionResult<CompanyDto>> GetCompany(int id)
    {
        var company = await _context.Companies
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.CompanyId == id);
        
        if (company == null)
            return NotFound();
        
        // Count 쿼리 최적화: 전체 컬렉션 Include 대신 개별 조회
        var usersCount = await _context.Users.CountAsync(u => u.CompanyId == id);
        var requestsCount = await _context.Requests.CountAsync(r => r.CompanyId == id);
        
        return Ok(new CompanyDto
        {
            CompanyId = company.CompanyId,
            Name = company.Name,
            Code = company.Code,
            PhoneNumber = company.PhoneNumber,
            IsActive = company.IsActive,
            UsersCount = usersCount,
            RequestsCount = requestsCount,
            CreatedAt = company.CreatedAt
        });
    }
    
    /// <summary>
    /// 회사별 ERP 시스템 목록 조회
    /// </summary>
    /// <param name="companyId">회사 ID</param>
    /// <returns>활성화된 ERP 시스템 목록</returns>
    [HttpGet("{companyId}/erp-systems")]
    [Authorize(Policy = AuthorizationPolicies.AdminOrManager)]
    public async Task<ActionResult<List<ErpSystemDto>>> GetErpSystems(int companyId)
    {
        var systems = await _context.ErpSystems
            .AsNoTracking()
            .Where(e => e.CompanyId == companyId && e.IsActive)
            .Select(e => new ErpSystemDto
            {
                ErpSystemId = e.ErpSystemId,
                CompanyId = e.CompanyId,
                Name = e.Name,
                Version = e.Version,
                Description = e.Description,
                IsActive = e.IsActive
            })
            .ToListAsync();
        
        return Ok(systems);
    }
    
    #endregion

    #region 생성/수정/삭제 API
    
    /// <summary>
    /// 회사 생성
    /// </summary>
    /// <param name="request">회사 생성 요청</param>
    /// <returns>생성된 회사 정보</returns>
    /// <remarks>회사 코드 중복 체크</remarks>
    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<ActionResult<CompanyDto>> CreateCompany([FromBody] CreateCompanyRequest request)
    {
        // 회사 코드 중복 체크
        if (await _context.Companies.AnyAsync(c => c.Code == request.Code))
            return BadRequest(new { message = "이미 사용 중인 회사 코드입니다." });
        
        var company = new Company
        {
            Name = request.Name,
            Code = request.Code,
            PhoneNumber = request.PhoneNumber,
            IsActive = request.IsActive,
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now
        };
        
        _context.Companies.Add(company);
        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "COMPANY", company.CompanyId, "CREATE", null, $"Name: {company.Name}");
        
        // 회사 목록 캐시 무효화
        _cache.Remove(CompaniesCacheKey);
        
        return CreatedAtAction(nameof(GetCompany), new { id = company.CompanyId }, new CompanyDto
        {
            CompanyId = company.CompanyId,
            Name = company.Name,
            Code = company.Code,
            PhoneNumber = company.PhoneNumber,
            IsActive = company.IsActive,
            UsersCount = 0,
            RequestsCount = 0,
            CreatedAt = company.CreatedAt
        });
    }
    
    /// <summary>
    /// 회사 정보 수정
    /// </summary>
    /// <param name="id">회사 ID</param>
    /// <param name="request">수정 요청 (null이 아닌 필드만 수정)</param>
    [HttpPut("{id}")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> UpdateCompany(int id, [FromBody] UpdateCompanyRequest request)
    {
        var company = await _context.Companies.FindAsync(id);
        if (company == null)
            return NotFound();
        
        // Partial Update: null이 아닌 필드만 수정
        if (request.Name != null)
            company.Name = request.Name;
        
        if (request.Code != null)
        {
            // 회사 코드 중복 체크 (자기 자신 제외)
            if (await _context.Companies.AnyAsync(c => c.Code == request.Code && c.CompanyId != id))
                return BadRequest(new { message = "이미 사용 중인 회사 코드입니다." });
            company.Code = request.Code;
        }
        
        if (request.PhoneNumber != null)
            company.PhoneNumber = request.PhoneNumber;
        
        if (request.IsActive.HasValue)
            company.IsActive = request.IsActive.Value;
        
        company.UpdatedAt = DateTime.Now;
        
        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "COMPANY", id, "UPDATE", null, $"Name: {company.Name}");
        
        // 회사 목록 캐시 무효화
        _cache.Remove(CompaniesCacheKey);
        
        return NoContent();
    }
    
    /// <summary>
    /// 회사 삭제
    /// </summary>
    /// <param name="id">회사 ID</param>
    /// <remarks>
    /// <para>삭제 불가 조건:</para>
    /// <list type="bullet">
    ///   <item><description>비앤에프소프트 (운영 회사)</description></item>
    ///   <item><description>소속 사용자가 있는 회사</description></item>
    ///   <item><description>등록된 요청이 있는 회사</description></item>
    /// </list>
    /// </remarks>
    [HttpDelete("{id}")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> DeleteCompany(int id)
    {
        var company = await _context.Companies.FindAsync(id);
        if (company == null)
            return NotFound();

        // 운영사(비앤에프소프트)는 삭제 불가
        if (company.Code == BnfCompany.CompanyCode)
        {
            return BadRequest(new { message = "운영 회사는 삭제할 수 없습니다." });
        }

        // 소속 사용자 존재 여부 확인
        if (await _context.Users.AnyAsync(u => u.CompanyId == id))
            return BadRequest(new { message = "사용자가 있는 회사는 삭제할 수 없습니다." });

        // 등록된 요청 존재 여부 확인
        if (await _context.Requests.AnyAsync(r => r.CompanyId == id))
            return BadRequest(new { message = "요청이 있는 회사는 삭제할 수 없습니다." });

        _context.Companies.Remove(company);
        await _context.SaveChangesAsync();

        await _auditLogService.LogActionAsync(GetCurrentUserId(), "COMPANY", id, "DELETE", null, $"Name: {company.Name}");

        // 회사 목록 캐시 무효화
        _cache.Remove(CompaniesCacheKey);

        return NoContent();
    }
    
    #endregion
}
