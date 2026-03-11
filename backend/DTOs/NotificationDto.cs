namespace BnfErpPortal.DTOs;

public class NotificationDto
{
    public int NotificationId { get; set; }
    public int UserId { get; set; }
    public int? RequestId { get; set; }
    public int? TaskId { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}
