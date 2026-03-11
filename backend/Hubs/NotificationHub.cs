using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace BnfErpPortal.Hubs;

/// <summary>
/// 실시간 알림 웹소켓 통신을 위한 SignalR 허브
/// </summary>
[Authorize]
public class NotificationHub : Hub
{
    private readonly ILogger<NotificationHub> _logger;

    public NotificationHub(ILogger<NotificationHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrEmpty(userId))
        {
            // 사용자별 그룹에 소켓 추가 (1:1 알림용)
            await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userId}");
            _logger.LogInformation("SignalR 클라이언트 연결: UserId={UserId}, ConnectionId={ConnectionId}", userId, Context.ConnectionId);
        }

        // 전체 알림 (Broadcasting) 그룹
        await Groups.AddToGroupAsync(Context.ConnectionId, "AllUsers");

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrEmpty(userId))
        {
            // 그룹 정리
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"User_{userId}");
            _logger.LogInformation("SignalR 클라이언트 연결 해제: UserId={UserId}, ConnectionId={ConnectionId}", userId, Context.ConnectionId);
        }

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "AllUsers");

        await base.OnDisconnectedAsync(exception);
    }
}
