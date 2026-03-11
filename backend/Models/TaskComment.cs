using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BnfErpPortal.Models;

[Table("TaskComment")]
public class TaskComment
{
    [Key]
    public int TaskCommentId { get; set; }

    [Required]
    public int TaskId { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    public string Content { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    [MaxLength(500)]
    public string? Extra1 { get; set; }

    [MaxLength(500)]
    public string? Extra2 { get; set; }

    public string? Extra3 { get; set; }

    // Navigation Properties
    [ForeignKey("TaskId")]
    public virtual InternalTask Task { get; set; } = null!;

    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;

    public virtual ICollection<TaskAttachment> Attachments { get; set; } = new List<TaskAttachment>();
}
