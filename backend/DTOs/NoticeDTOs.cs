namespace BnfErpPortal.DTOs;

public class NoticeDto
{
    public int NoticeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public bool IsPinned { get; set; }
    public bool IsActive { get; set; }
    public int ViewCount { get; set; }
    public UserSimpleDto? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<NoticeAttachmentDto> Attachments { get; set; } = new();
}

public class NoticeListDto
{
    public int NoticeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public bool IsPinned { get; set; }
    public int ViewCount { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int AttachmentCount { get; set; }
}

public class NoticeAttachmentDto
{
    public int AttachmentId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string? ContentType { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateNoticeRequest
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public bool IsPinned { get; set; } = false;
    public bool IsActive { get; set; } = true;
}

public class UpdateNoticeRequest
{
    public string? Title { get; set; }
    public string? Content { get; set; }
    public bool? IsPinned { get; set; }
    public bool? IsActive { get; set; }
}

public class UserSimpleDto
{
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}
