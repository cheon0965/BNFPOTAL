using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using BnfErpPortal.Data;
using BnfErpPortal.DTOs;
using BnfErpPortal.Constants;
using BnfErpPortal.Services;

namespace BnfErpPortal.Controllers;

[ApiController]
[Route("api/email-templates")]
[Authorize(Policy = AuthorizationPolicies.AdminOrManager)]
public class EmailTemplatesController : ControllerBase
{
    private const string AlwaysEnabledTemplateKey = "USER_PASSWORD_RESET";

    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public EmailTemplatesController(ApplicationDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }
    
    private int GetCurrentUserId() => int.Parse(User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier) ?? "0");

    [HttpGet]
    // GetAll 액션 - 이메일 템플릿 목록을 조회하여 코드, 제목, 사용 여부를 확인합니다.
    public async Task<ActionResult<List<EmailTemplateDto>>> GetAll()
    {
        var items = await _context.EmailTemplates
            .OrderBy(e => e.TemplateKey)
            .Select(e => new EmailTemplateDto
            {
                EmailTemplateId = e.EmailTemplateId,
                TemplateKey = e.TemplateKey,
                Name = e.Name,
                SubjectTemplate = e.SubjectTemplate,
                BodyTemplate = e.BodyTemplate,
                IsEnabled = e.IsEnabled
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("{id}")]
    // Get 액션 - 데이터를 조회합니다.
    public async Task<ActionResult<EmailTemplateDto>> Get(int id)
    {
        var template = await _context.EmailTemplates.FindAsync(id);
        if (template == null)
            return NotFound();

        var dto = new EmailTemplateDto
        {
            EmailTemplateId = template.EmailTemplateId,
            TemplateKey = template.TemplateKey,
            Name = template.Name,
            SubjectTemplate = template.SubjectTemplate,
            BodyTemplate = template.BodyTemplate,
            IsEnabled = template.IsEnabled
        };

        return Ok(dto);
    }

    [HttpPut("{id}")]
    // Update 액션 - 기존 이메일 템플릿의 제목/본문 템플릿을 수정합니다.
    public async Task<IActionResult> Update(int id, [FromBody] UpdateEmailTemplateRequest request)
    {
        var template = await _context.EmailTemplates.FindAsync(id);
        if (template == null)
            return NotFound();

        template.SubjectTemplate = request.SubjectTemplate;
        template.BodyTemplate = request.BodyTemplate;
        template.IsEnabled = template.TemplateKey == AlwaysEnabledTemplateKey
            ? true
            : request.IsEnabled;
        template.UpdatedAt = DateTime.Now;

        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "EMAIL_TEMPLATE", id, "UPDATE", null, $"TemplateKey: {template.TemplateKey}");
        
        return NoContent();
    }
}
