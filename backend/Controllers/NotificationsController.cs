using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using BnfErpPortal.Data;
using BnfErpPortal.DTOs;
using BnfErpPortal.Models;

namespace BnfErpPortal.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public NotificationsController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GetCurrentUserId 액션 - 데이터를 조회합니다.
    private int GetCurrentUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

    [HttpGet]
    // GetNotifications 액션 - 현재 로그인 사용자의 알림 목록을 최신 순으로 조회합니다.
    public async Task<ActionResult<List<NotificationDto>>> GetNotifications()
    {
        var userId = GetCurrentUserId();

        var entities = await _context.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(10) // Limit to last 10 notifications (for notification dropdown)
            .ToListAsync();

        var notifications = entities.Select(n => new NotificationDto
        {
            NotificationId = n.NotificationId,
            UserId = n.UserId,
            RequestId = n.RequestId,
            TaskId = ParseTaskIdFromType(n.Type) ?? (IsTaskNotificationType(n.Type) ? n.RequestId : null),
            Message = n.Message,
            Type = n.Type,
            IsRead = n.IsRead,
            CreatedAt = n.CreatedAt
        }).ToList();

        return Ok(notifications);
    }

    [HttpPatch("{id}/read")]
    // MarkAsRead 액션 - 단일 알림을 읽음으로 표시합니다.
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var userId = GetCurrentUserId();
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.NotificationId == id && n.UserId == userId);

        if (notification == null)
            return NotFound();

        notification.IsRead = true;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPatch("read-all")]
    // MarkAllAsRead 액션 - 현재 로그인 사용자의 모든 미읽음 알림을 일괄 읽음 처리합니다.
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = GetCurrentUserId();
        var unreadNotifications = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        foreach (var notification in unreadNotifications)
        {
            notification.IsRead = true;
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static int? ParseTaskIdFromType(string? type)
    {
        if (string.IsNullOrWhiteSpace(type))
            return null;

        if (!type.StartsWith("TASK_"))
            return null;

        var separatorIndex = type.LastIndexOf(':');
        if (separatorIndex <= 0 || separatorIndex >= type.Length - 1)
            return null;

        var taskIdText = type[(separatorIndex + 1)..];
        return int.TryParse(taskIdText, out var taskId) ? taskId : null;
    }

    private static bool IsTaskNotificationType(string? type)
    {
        if (string.IsNullOrWhiteSpace(type))
            return false;

        return type.StartsWith("TASK", StringComparison.Ordinal);
    }
}
