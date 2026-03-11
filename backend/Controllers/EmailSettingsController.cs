using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Caching.Memory;
using BnfErpPortal.Data;
using BnfErpPortal.DTOs;
using BnfErpPortal.Models;
using BnfErpPortal.Constants;
using BnfErpPortal.Services;

namespace BnfErpPortal.Controllers;

[ApiController]
[Route("api/email-settings")]
[Authorize(Policy = AuthorizationPolicies.AdminOrManager)]
public class EmailSettingsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IMemoryCache _cache;
    private readonly IAuditLogService _auditLogService;
    
    private const string EmailSettingsCacheKey = "EmailSettings";

    public EmailSettingsController(
        ApplicationDbContext context, 
        IConfiguration configuration,
        IMemoryCache cache,
        IAuditLogService auditLogService)
    {
        _context = context;
        _configuration = configuration;
        _cache = cache;
        _auditLogService = auditLogService;
    }
    
    private int GetCurrentUserId() => int.Parse(User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier) ?? "0");

    /// <summary>
    /// 메일 발송 설정 조회 (없으면 appsettings.json 기준 기본값 반환)
    /// </summary>
    [HttpGet]
    // Get 액션 - 현재 저장된 메일 서버(SMTP) 설정 정보를 조회합니다.
    public async Task<ActionResult<EmailSettingsDto>> Get()
    {
        var settings = await _context.EmailSettings.AsNoTracking().FirstOrDefaultAsync();

        if (settings == null)
        {
            // DB에 아직 설정이 없으면 appsettings.json 의 Email 섹션을 그대로 내려준다.
            var section = _configuration.GetSection("Email");
            var host = section["Host"] ?? string.Empty;
            var portValue = section["Port"];
            var user = section["User"] ?? string.Empty;
            var password = section["Password"] ?? string.Empty;
            var from = section["From"] ?? user;
            var enableSslValue = section["EnableSsl"];

            int port = 25;
            if (!string.IsNullOrWhiteSpace(portValue) && int.TryParse(portValue, out var parsedPort))
            {
                port = parsedPort;
            }

            bool enableSsl = true;
            if (!string.IsNullOrWhiteSpace(enableSslValue) && bool.TryParse(enableSslValue, out var parsedEnableSsl))
            {
                enableSsl = parsedEnableSsl;
            }

            var dtoFromConfig = new EmailSettingsDto
            {
                EmailSettingsId = 0,
                Host = host,
                Port = port,
                User = user,
                Password = password,
                FromAddress = from ?? user,
                EnableSsl = enableSsl
            };

            return Ok(dtoFromConfig);
        }

        var dto = new EmailSettingsDto
        {
            EmailSettingsId = settings.EmailSettingsId,
            Host = settings.Host,
            Port = settings.Port,
            User = settings.User,
            Password = settings.Password,
            FromAddress = settings.FromAddress,
            EnableSsl = settings.EnableSsl
        };

        return Ok(dto);
    }

    /// <summary>
    /// 메일 발송 설정 저장/수정 (단일 레코드만 관리)
    /// </summary>
    [HttpPut]
    // Update 액션 - 호스트, 포트, 계정, 발신 주소, SSL 여부 등 메일 서버 설정을 저장/수정합니다.
    public async Task<IActionResult> Update([FromBody] UpdateEmailSettingsRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var settings = await _context.EmailSettings.FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new EmailSettings();
            _context.EmailSettings.Add(settings);
        }

        settings.Host = request.Host;
        settings.Port = request.Port;
        settings.User = request.User;
        settings.Password = request.Password;
        settings.FromAddress = string.IsNullOrWhiteSpace(request.FromAddress)
            ? request.User
            : request.FromAddress;
        settings.EnableSsl = request.EnableSsl;
        settings.UpdatedAt = DateTime.Now;

        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "EMAIL_SETTING", settings.EmailSettingsId, "UPDATE", null, $"Host: {settings.Host}");
        
        // 이메일 설정 캐시 무효화
        _cache.Remove(EmailSettingsCacheKey);

        return NoContent();
    }
}