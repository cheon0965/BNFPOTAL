// ============================================================================
// 파일명: Attachment.cs
// 경로: Backend/Models/Attachment.cs
// 설명: 첨부파일(Attachment) 엔티티 모델
// ----------------------------------------------------------------------------
// [관련 테이블] Attachment
// [관계]
//   - Request (N:1) - 소속 요청
//   - RequestComment (N:1, 선택) - 소속 댓글 (null이면 요청 레벨 첨부)
// [유지보수 가이드]
//   - CommentId == null: 요청 레벨 첨부파일
//   - CommentId != null: 댓글 레벨 첨부파일
//   - 파일 저장 경로는 appsettings.json의 FileStorage:UploadPath 참조
// ============================================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BnfErpPortal.Models;

/// <summary>
/// 첨부파일(Attachment) 엔티티
/// </summary>
/// <remarks>
/// <para>요청 또는 댓글에 첨부된 파일 정보를 관리</para>
/// <para>CommentId 유무로 첨부 대상(요청/댓글)을 구분</para>
/// <para>실제 파일은 FileStorage:UploadPath 경로에 저장</para>
/// </remarks>
[Table("Attachment")]
public class Attachment
{
    #region 기본 키
    
    /// <summary>첨부파일 고유 ID (PK, Auto Increment)</summary>
    [Key]
    public int AttachmentId { get; set; }
    
    #endregion

    #region 외래 키
    
    /// <summary>소속 요청 ID (FK → Request.RequestId)</summary>
    [Required]
    public int RequestId { get; set; }
    
    /// <summary>
    /// 소속 댓글 ID (FK → RequestComment.CommentId)
    /// </summary>
    /// <remarks>
    /// <para>null: 요청 레벨 첨부파일</para>
    /// <para>값 있음: 해당 댓글의 첨부파일</para>
    /// </remarks>
    public int? CommentId { get; set; }
    
    #endregion

    #region 파일 정보
    
    /// <summary>원본 파일명 (사용자에게 표시)</summary>
    [Required]
    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;
    
    /// <summary>
    /// 서버 저장 경로 (GUID 기반)
    /// </summary>
    /// <remarks>
    /// <para>형식: {GUID}_{원본파일명}</para>
    /// <para>실제 경로: FileStorage:UploadPath/{StoredPath}</para>
    /// </remarks>
    [Required]
    [MaxLength(500)]
    public string StoredPath { get; set; } = string.Empty;
    
    /// <summary>파일 크기 (바이트)</summary>
    public long FileSize { get; set; }
    
    /// <summary>
    /// MIME 타입
    /// </summary>
    /// <remarks>예: application/pdf, image/png</remarks>
    [MaxLength(100)]
    public string? ContentType { get; set; }
    
    #endregion

    #region 감사(Audit) 필드
    
    /// <summary>업로드 일시</summary>
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    #endregion

    #region Navigation Properties (관계 탐색)
    
    /// <summary>소속 요청 정보</summary>
    [ForeignKey("RequestId")]
    public virtual Request Request { get; set; } = null!;
    
    /// <summary>소속 댓글 정보 (댓글 레벨 첨부 시)</summary>
    [ForeignKey("CommentId")]
    public virtual RequestComment? Comment { get; set; }
    
    #endregion
}
