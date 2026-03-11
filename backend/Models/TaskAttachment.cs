using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BnfErpPortal.Models;

/// <summary>
/// 내부 업무 첨부파일(TaskAttachment) 엔티티
/// </summary>
/// <remarks>
/// <para>업무 또는 업무 코멘트에 첨부된 파일 정보를 관리</para>
/// <para>TaskCommentId 유무로 첨부 대상(업무/코멘트)을 구분</para>
/// <para>실제 파일은 FileStorage:UploadPath 경로에 저장</para>
/// </remarks>
[Table("TaskAttachment")]
public class TaskAttachment
{
    [Key]
    public int TaskAttachmentId { get; set; }

    /// <summary>소속 업무 ID (FK → InternalTask.TaskId)</summary>
    [Required]
    public int TaskId { get; set; }

    /// <summary>
    /// 소속 코멘트 ID (FK → TaskComment.TaskCommentId)
    /// null이면 업무 레벨, 값 있으면 코멘트 레벨
    /// </summary>
    public int? TaskCommentId { get; set; }

    [Required]
    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string StoredPath { get; set; } = string.Empty;

    public long FileSize { get; set; }

    [MaxLength(100)]
    public string? ContentType { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    // Navigation Properties
    [ForeignKey("TaskId")]
    public virtual InternalTask Task { get; set; } = null!;

    [ForeignKey("TaskCommentId")]
    public virtual TaskComment? Comment { get; set; }
}
