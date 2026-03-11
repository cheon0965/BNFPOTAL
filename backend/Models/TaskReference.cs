using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BnfErpPortal.Models;

[Table("TaskReference")]
public class TaskReference
{
    [Key]
    public int TaskReferenceId { get; set; }

    [Required]
    public int TaskId { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    public int AddedByUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    [MaxLength(500)]
    public string? Extra1 { get; set; }

    [MaxLength(500)]
    public string? Extra2 { get; set; }

    public string? Extra3 { get; set; }

    [ForeignKey("TaskId")]
    public virtual InternalTask Task { get; set; } = null!;

    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;

    [ForeignKey("AddedByUserId")]
    public virtual User AddedByUser { get; set; } = null!;
}
