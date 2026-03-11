using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using BnfErpPortal.Data;
using BnfErpPortal.DTOs;
using BnfErpPortal.Models;
using BnfErpPortal.Constants;
using BnfErpPortal.Services;

namespace BnfErpPortal.Controllers;

[ApiController]
[Route("api/registration-codes")]
[Authorize(Policy = AuthorizationPolicies.AdminOrManager)]
public class RegistrationCodesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;
    
    public RegistrationCodesController(ApplicationDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }
    
    // GetCurrentUserId 액션 - 데이터를 조회합니다.
    private int GetCurrentUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
    
    [HttpGet]
    // GetCodes 액션 - 검색/회사 필터로 회원가입용 등록 코드 목록을 조회합니다.
    public async Task<ActionResult<List<RegistrationCodeDto>>> GetCodes([FromQuery] string? search)
    {
        var query = _context.RegistrationCodes
            .Include(r => r.Company)
            .AsQueryable();
        
        if (!string.IsNullOrEmpty(search))
            query = query.Where(r => 
                r.Code.Contains(search) || 
                r.Company.Name.Contains(search) ||
                (r.Description != null && r.Description.Contains(search)));
        
        var codes = await query
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new RegistrationCodeDto
            {
                RegistrationCodeId = r.RegistrationCodeId,
                CompanyId = r.CompanyId,
                CompanyName = r.Company.Name,
                Code = r.Code,
                Description = r.Description,
                MaxUses = r.MaxUses,
                UsedCount = r.UsedCount,
                RoleDefault = r.RoleDefault,
                ExpiresAt = r.ExpiresAt,
                UserIsActiveDefault = r.UserIsActiveDefault,
                IsActive = r.IsActive,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();
        
        return Ok(codes);
    }
    
    [HttpGet("{id}")]
    // GetCode 액션 - 단일 등록 코드의 상세 정보와 사용 현황을 조회합니다.
    public async Task<ActionResult<RegistrationCodeDto>> GetCode(int id)
    {
        var code = await _context.RegistrationCodes
            .Include(r => r.Company)
            .FirstOrDefaultAsync(r => r.RegistrationCodeId == id);
        
        if (code == null)
            return NotFound();
        
        return Ok(new RegistrationCodeDto
        {
            RegistrationCodeId = code.RegistrationCodeId,
            CompanyId = code.CompanyId,
            CompanyName = code.Company.Name,
            Code = code.Code,
            Description = code.Description,
            MaxUses = code.MaxUses,
            UsedCount = code.UsedCount,
            RoleDefault = code.RoleDefault,
            ExpiresAt = code.ExpiresAt,
            UserIsActiveDefault = code.UserIsActiveDefault,
            IsActive = code.IsActive,
            CreatedAt = code.CreatedAt
        });
    }
    
    [HttpPost]
    // CreateCode 액션 - 특정 회사에 사용할 새 등록 코드를 생성하고, 만료일/최대 사용 횟수를 설정합니다.
    public async Task<ActionResult<RegistrationCodeDto>> CreateCode([FromBody] CreateRegistrationCodeRequest request)
    {
        var company = await _context.Companies.FindAsync(request.CompanyId);
        if (company == null)
            return BadRequest(new { message = "존재하지 않는 회사입니다." });
        
        // 회사 유형에 따라 허용되는 기본 역할 제한
        // - 일반 회사: 고객(CUSTOMER) 역할만 허용
        // - BNF 회사: 내부 역할(매니저, 엔지니어) + 고객 허용 (시스템 관리자는 등록 코드로 발급하지 않음)
        var allowedRoles = new List<string>();
        if (company.CompanyId == BnfCompany.CompanyId)
        {
            // BNF 회사: 매니저, 엔지니어, 고객
            allowedRoles.Add(UserRoles.Manager);
            allowedRoles.Add(UserRoles.Engineer);
            allowedRoles.Add(UserRoles.Customer);
        }
        else
        {
            // 일반 회사: 고객 역할만 허용
            allowedRoles.Add(UserRoles.Customer);
        }

        if (!allowedRoles.Contains(request.RoleDefault))
        {
            return BadRequest(new { message = "해당 회사에서는 선택할 수 없는 기본 역할입니다." });
        }

        var generatedCode = GenerateCode();
        
        var regCode = new RegistrationCode
        {
            CompanyId = request.CompanyId,
            Code = generatedCode,
            Description = request.Description,
            MaxUses = request.MaxUses,
            UsedCount = 0,
            RoleDefault = request.RoleDefault,
            ExpiresAt = request.ExpiresAt,
            UserIsActiveDefault = request.UserIsActiveDefault,
            IsActive = true,
            CreatedByUserId = GetCurrentUserId(),
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now
        };
        
        _context.RegistrationCodes.Add(regCode);
        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "REGISTRATION_CODE", regCode.RegistrationCodeId, "CREATE", null, $"Code: {regCode.Code}, Role: {regCode.RoleDefault}");
        
        return CreatedAtAction(nameof(GetCode), new { id = regCode.RegistrationCodeId }, new RegistrationCodeDto
        {
            RegistrationCodeId = regCode.RegistrationCodeId,
            CompanyId = regCode.CompanyId,
            CompanyName = company.Name,
            Code = regCode.Code,
            Description = regCode.Description,
            MaxUses = regCode.MaxUses,
            UsedCount = regCode.UsedCount,
            RoleDefault = regCode.RoleDefault,
            ExpiresAt = regCode.ExpiresAt,
            UserIsActiveDefault = regCode.UserIsActiveDefault,
            IsActive = regCode.IsActive,
            CreatedAt = regCode.CreatedAt
        });
    }
    
    [HttpPut("{id}")]
    // UpdateCode 액션 - 등록 코드의 설명, 만료일, 최대 사용 횟수, 활성 여부를 수정합니다.
    public async Task<IActionResult> UpdateCode(int id, [FromBody] UpdateRegistrationCodeRequest request)
    {
        var code = await _context.RegistrationCodes.FindAsync(id);
        if (code == null)
            return NotFound();
        
        if (request.Description != null)
            code.Description = request.Description;
        
        if (request.MaxUses.HasValue)
            code.MaxUses = request.MaxUses.Value == 0 ? null : request.MaxUses;
        
        if (request.ExpiresAt.HasValue)
            code.ExpiresAt = request.ExpiresAt;

        if (request.IsActive.HasValue)
            code.IsActive = request.IsActive.Value;

        if (request.UserIsActiveDefault.HasValue)
            code.UserIsActiveDefault = request.UserIsActiveDefault.Value;

        code.UpdatedAt = DateTime.Now;

        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "REGISTRATION_CODE", id, "UPDATE", null, $"Code: {code.Code}");
        
        return NoContent();
    }
    
    [HttpDelete("{id}")]
    // DeleteCode 액션 - 더 이상 사용하지 않는 등록 코드를 삭제합니다.
    public async Task<IActionResult> DeleteCode(int id)
    {
        var code = await _context.RegistrationCodes.FindAsync(id);
        if (code == null)
            return NotFound();
        
        _context.RegistrationCodes.Remove(code);
        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "REGISTRATION_CODE", id, "DELETE", null, $"Code: {code.Code}");
        
        return NoContent();
    }
    
    // GenerateCode 액션 - 처리를 수행합니다.
    private string GenerateCode()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var random = new Random();
        var code = new char[10];
        for (int i = 0; i < 10; i++)
        {
            code[i] = chars[random.Next(chars.Length)];
        }
        return new string(code);
    }
}

public class UpdateRegistrationCodeRequest
{
    public string? Description { get; set; }
    public int? MaxUses { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool? IsActive { get; set; }
    public bool? UserIsActiveDefault { get; set; }
}