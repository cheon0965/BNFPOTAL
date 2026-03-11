// ============================================================================
// 파일명: AuditLogsController.cs
// 경로: Backend/Controllers/AuditLogsController.cs
// 설명: 감사 로그(AuditLog) 데이터를 프론트엔드로 전달하는 API 컨트롤러
// ----------------------------------------------------------------------------
// [API 엔드포인트]
//   GET  /api/auditlogs  - 감사 로그 목록 페이징 조회 (관리자 전용)
// ============================================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BnfErpPortal.Constants;
using BnfErpPortal.Data;
using BnfErpPortal.DTOs;

namespace BnfErpPortal.Controllers;

[Route("api/[controller]")]
[Authorize(Policy = AuthorizationPolicies.AdminOrManager)] // 관리자와 매니저만 접근 가능
public class AuditLogsController : BaseController
{
    private readonly ApplicationDbContext _context;

    public AuditLogsController(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// 감사 로그 목록 조회 (페이징, 필터링)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<object>>> GetLogs(
        [FromQuery] string? entityType,
        [FromQuery] string? actionName,
        [FromQuery] int? userId,
        [FromQuery] string? sortKey,
        [FromQuery] string? sortDir,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _context.AuditLogs
            .Include(a => a.User)
            .AsQueryable();

        if (!string.IsNullOrEmpty(entityType))
            query = query.Where(a => a.EntityType == entityType);

        if (!string.IsNullOrEmpty(actionName))
            query = query.Where(a => a.Action == actionName);

        if (userId.HasValue)
            query = query.Where(a => a.UserId == userId.Value);

        var totalCount = await query.CountAsync();

        // 정렬 적용
        bool isAsc = string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);
        query = sortKey?.ToLower() switch
        {
            "username" => isAsc ? query.OrderBy(a => a.User!.Name) : query.OrderByDescending(a => a.User!.Name),
            "entitytype" => isAsc ? query.OrderBy(a => a.EntityType) : query.OrderByDescending(a => a.EntityType),
            "action" => isAsc ? query.OrderBy(a => a.Action) : query.OrderByDescending(a => a.Action),
            _ => isAsc ? query.OrderBy(a => a.CreatedAt) : query.OrderByDescending(a => a.CreatedAt) // 기본 정렬값
        };

        var logs = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => (object)new
            {
                a.AuditLogId,
                a.UserId,
                UserName = a.User != null ? a.User.Name : null,
                UserEmail = a.User != null ? a.User.Email : null,
                a.EntityType,
                a.EntityId,
                a.Action,
                a.OldValue,
                a.NewValue,
                a.CreatedAt
            })
            .ToListAsync();

        return Ok(new PagedResult<object>
        {
            Items = logs,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }
}
