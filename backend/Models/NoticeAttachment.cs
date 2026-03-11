// ============================================================================
// 파일명: NoticeAttachment.cs
// 경로: Backend/Models/NoticeAttachment.cs
// 설명: 공지사항 첨부파일(NoticeAttachment) 엔티티 모델
// ----------------------------------------------------------------------------
// [관련 테이블] NoticeAttachment
// [관계] Notice (N:1) - 소속 공지사항
// ============================================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BnfErpPortal.Models;

/// <summary>
/// 공지사항 첨부파일(NoticeAttachment) 엔티티
/// </summary>
[Table("NoticeAttachment")]
public class NoticeAttachment
{
    /// <summary>첨부파일 고유 ID (PK)</summary>
    [Key]
    public int AttachmentId { get; set; }
    
    /// <summary>소속 공지사항 ID (FK)</summary>
    [Required]
    public int NoticeId { get; set; }
    
    /// <summary>원본 파일명</summary>
    [Required]
    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;
    
    /// <summary>서버 저장 경로</summary>
    [Required]
    [MaxLength(500)]
    public string StoredPath { get; set; } = string.Empty;
    
    /// <summary>파일 크기 (바이트)</summary>
    public long FileSize { get; set; }
    
    /// <summary>MIME 타입</summary>
    [MaxLength(100)]
    public string? ContentType { get; set; }
    
    /// <summary>업로드 일시</summary>
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    /// <summary>소속 공지사항</summary>
    [ForeignKey("NoticeId")]
    public virtual Notice Notice { get; set; } = null!;
}
