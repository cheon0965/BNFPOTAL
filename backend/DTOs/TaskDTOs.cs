using System.ComponentModel.DataAnnotations;

namespace BnfErpPortal.DTOs;

#region 업무(Task) DTO

public class TaskDto
{
    public int TaskId { get; set; }
    public int? CompanyId { get; set; }
    public string? CompanyName { get; set; }
    public int? ErpSystemId { get; set; }
    public string? ErpSystemName { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public UserDto CreatedBy { get; set; } = null!;
    public UserDto AssignedTo { get; set; } = null!;
    public DateTime? DueDate { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int CommentsCount { get; set; }
    public List<TaskAttachmentDto> Attachments { get; set; } = new();
    public List<UserDto> ReferenceUsers { get; set; } = new();
}

public class CreateTaskRequest
{
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    [Required]
    public string Category { get; set; } = "GENERAL";

    [Required]
    public string Priority { get; set; } = "MEDIUM";

    [Required]
    public int AssignedToUserId { get; set; }

    public int? CompanyId { get; set; }
    public int? ErpSystemId { get; set; }

    public DateTime? DueDate { get; set; }

    public List<int> ReferenceUserIds { get; set; } = new();
}

public class UpdateTaskRequest
{
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    [Required]
    public string Category { get; set; } = "GENERAL";

    [Required]
    public string Priority { get; set; } = "MEDIUM";

    public int AssignedToUserId { get; set; }

    public int? CompanyId { get; set; }
    public int? ErpSystemId { get; set; }

    public DateTime? DueDate { get; set; }

    public List<int> ReferenceUserIds { get; set; } = new();
}

public class UpdateTaskStatusRequest
{
    [Required]
    public string Status { get; set; } = string.Empty;
}

#endregion

#region 업무 코멘트 DTO

public class TaskCommentDto
{
    public int TaskCommentId { get; set; }
    public int TaskId { get; set; }
    public UserDto User { get; set; } = null!;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public List<TaskAttachmentDto> Attachments { get; set; } = new();
}

public class CreateTaskCommentRequest
{
    [Required]
    public string Content { get; set; } = string.Empty;
}

#endregion

#region 업무 첨부파일 DTO

public class TaskAttachmentDto
{
    public int TaskAttachmentId { get; set; }
    public int? TaskCommentId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string? ContentType { get; set; }
    public DateTime CreatedAt { get; set; }
}

#endregion

#region 업무 통계 DTO

public class TaskStatsDto
{
    public int Total { get; set; }
    public int Pending { get; set; }
    public int InProgress { get; set; }
    public int Completed { get; set; }
    public int Cancelled { get; set; }
}

#endregion

