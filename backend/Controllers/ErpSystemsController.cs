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
[Route("api/erp-systems")]
[Authorize]
public class ErpSystemsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;
    
    public ErpSystemsController(ApplicationDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }
    
    // GetCurrentUserId 액션 - 데이터를 조회합니다.
    private int GetCurrentUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
    
    // GetCurrentCompanyId 액션 - 데이터를 조회합니다.
    private int? GetCurrentCompanyId()
    {
        var companyIdStr = User.FindFirstValue("CompanyId");
        return string.IsNullOrEmpty(companyIdStr) ? null : int.Parse(companyIdStr);
    }
    
    // GetCurrentRole 액션 - 데이터를 조회합니다.
    private string GetCurrentRole() => User.FindFirstValue(ClaimTypes.Role) ?? "";
    // IsInternalUser 액션 - 처리를 수행합니다.
    private bool IsInternalUser() => new[] { "ADMIN", "MANAGER", "ENGINEER" }.Contains(GetCurrentRole());
    
    [HttpGet]
    // GetSystems 액션 - 회사 및 검색어 조건에 따라 ERP 시스템 목록을 조회합니다.
    public async Task<ActionResult<List<ErpSystemDto>>> GetSystems([FromQuery] int? companyId)
    {
        var query = _context.ErpSystems.Where(e => e.IsActive).AsQueryable();
        
        // For customer users, only show their company's systems
        if (!IsInternalUser())
        {
            var userCompanyId = GetCurrentCompanyId();
            if (userCompanyId.HasValue)
                query = query.Where(e => e.CompanyId == userCompanyId.Value);
        }
        else if (companyId.HasValue)
        {
            query = query.Where(e => e.CompanyId == companyId.Value);
        }
        
        var systems = await query
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
    
    [HttpGet("{id}")]
    // GetSystem 액션 - 단일 ERP 시스템의 상세 정보와 설명을 조회합니다.
    public async Task<ActionResult<ErpSystemDto>> GetSystem(int id)
    {
        var system = await _context.ErpSystems.FindAsync(id);
        
        if (system == null)
            return NotFound();
        
        // Check access
        if (!IsInternalUser() && system.CompanyId != GetCurrentCompanyId())
            return Forbid();
        
        return Ok(new ErpSystemDto
        {
            ErpSystemId = system.ErpSystemId,
            CompanyId = system.CompanyId,
            Name = system.Name,
            Version = system.Version,
            Description = system.Description,
            IsActive = system.IsActive
        });
    }
    
    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.AdminOrManager)]
    // CreateSystem 액션 - 회사에 연결된 새로운 ERP 시스템 정보를 등록합니다.
    public async Task<ActionResult<ErpSystemDto>> CreateSystem([FromBody] CreateErpSystemRequest request)
    {
        var company = await _context.Companies.FindAsync(request.CompanyId);
        if (company == null)
            return BadRequest(new { message = "존재하지 않는 회사입니다." });
        
        var system = new ErpSystem
        {
            CompanyId = request.CompanyId,
            Name = request.Name,
            Version = request.Version,
            Description = request.Description,
            IsActive = true
        };
        
        _context.ErpSystems.Add(system);
        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "ERP_SYSTEM", system.ErpSystemId, "CREATE", null, $"Name: {system.Name}, Version: {system.Version}");
        
        return CreatedAtAction(nameof(GetSystem), new { id = system.ErpSystemId }, new ErpSystemDto
        {
            ErpSystemId = system.ErpSystemId,
            CompanyId = system.CompanyId,
            Name = system.Name,
            Version = system.Version,
            Description = system.Description,
            IsActive = system.IsActive
        });
    }
    
    [HttpPut("{id}")]
    [Authorize(Policy = AuthorizationPolicies.AdminOrManager)]
    // UpdateSystem 액션 - ERP 시스템의 이름, 버전, 설명, 활성 상태를 수정합니다.
    public async Task<IActionResult> UpdateSystem(int id, [FromBody] UpdateErpSystemRequest request)
    {
        var system = await _context.ErpSystems.FindAsync(id);
        if (system == null)
            return NotFound();
        
        if (request.Name != null)
            system.Name = request.Name;
        
        if (request.Version != null)
            system.Version = request.Version;
        
        if (request.Description != null)
            system.Description = request.Description;
        
        if (request.IsActive.HasValue)
            system.IsActive = request.IsActive.Value;
        
        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "ERP_SYSTEM", id, "UPDATE", null, $"Name: {system.Name}, Version: {system.Version}");
        
        return NoContent();
    }
    
    [HttpDelete("{id}")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    // DeleteSystem 액션 - ERP 시스템 레코드를 삭제하며, 참조 제약 조건을 고려해 처리합니다.
    public async Task<IActionResult> DeleteSystem(int id)
    {
        var system = await _context.ErpSystems.FindAsync(id);
        if (system == null)
            return NotFound();
        
        // Check if system has requests
        if (await _context.Requests.AnyAsync(r => r.ErpSystemId == id))
            return BadRequest(new { message = "요청이 있는 ERP 시스템은 삭제할 수 없습니다." });
        
        _context.ErpSystems.Remove(system);
        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "ERP_SYSTEM", id, "DELETE", null, $"Name: {system.Name}");
        
        return NoContent();
    }
}

public class CreateErpSystemRequest
{
    public int CompanyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Version { get; set; }
    public string? Description { get; set; }
}

public class UpdateErpSystemRequest
{
    public string? Name { get; set; }
    public string? Version { get; set; }
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
}