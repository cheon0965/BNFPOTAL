using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BnfErpPortal.Models;

[Table("InternalTask")]
public class InternalTask
{
    [Key]
    public int TaskId { get; set; }

    [Required]
    public int CreatedByUserId { get; set; }

    [Required]
    public int AssignedToUserId { get; set; }

    /// <summary>관련 회사 ID (FK → Company.CompanyId, 선택)</summary>
    public int? CompanyId { get; set; }

    /// <summary>관련 ERP 시스템 ID (FK → ErpSystem.ErpSystemId, 선택)</summary>
    public int? ErpSystemId { get; set; }

    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Category { get; set; } = "GENERAL";

    [Required]
    [MaxLength(50)]
    public string Priority { get; set; } = "MEDIUM";

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "PENDING";

    public DateTime? DueDate { get; set; }

    public DateTime? StartedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public DateTime UpdatedAt { get; set; } = DateTime.Now;

    [MaxLength(500)]
    public string? Extra1 { get; set; }

    [MaxLength(500)]
    public string? Extra2 { get; set; }

    public string? Extra3 { get; set; }

    // Navigation Properties
    [ForeignKey("CreatedByUserId")]
    public virtual User CreatedBy { get; set; } = null!;

    [ForeignKey("AssignedToUserId")]
    public virtual User AssignedTo { get; set; } = null!;

    [ForeignKey("CompanyId")]
    public virtual Company? Company { get; set; }

    [ForeignKey("ErpSystemId")]
    public virtual ErpSystem? ErpSystem { get; set; }

    public virtual ICollection<TaskComment> Comments { get; set; } = new List<TaskComment>();
    public virtual ICollection<TaskAttachment> Attachments { get; set; } = new List<TaskAttachment>();
    public virtual ICollection<TaskReference> ReferenceUsers { get; set; } = new List<TaskReference>();
}
