// ============================================================================
// 파일명: RequestComment.cs
// 경로: Backend/Models/RequestComment.cs
// 설명: 요청 댓글/답변(RequestComment) 엔티티 모델
// ----------------------------------------------------------------------------
// [관련 테이블] RequestComment
// [관계]
//   - Request (N:1) - 소속 요청
//   - User (N:1) - 작성자
//   - Attachment (1:N) - 댓글 첨부파일
// [유지보수 가이드]
//   - IsInternal이 true인 댓글은 고객에게 표시되지 않음
//   - 내부 사용자가 외부 댓글(IsInternal=false) 작성 시 상태 자동 변경
// ============================================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BnfErpPortal.Models;

/// <summary>
/// 요청 댓글/답변(RequestComment) 엔티티
/// </summary>
/// <remarks>
/// <para>요청에 대한 답변 및 추가 문의를 관리</para>
/// <para>IsInternal 플래그로 내부 메모와 고객 공개 답변을 구분</para>
/// <para>내부 사용자가 외부 댓글 작성 시 요청 상태가 INTERIM_REPLIED로 자동 변경</para>
/// </remarks>
[Table("RequestComment")]
public class RequestComment
{
    #region 기본 키
    
    /// <summary>댓글 고유 ID (PK, Auto Increment)</summary>
    [Key]
    public int CommentId { get; set; }
    
    #endregion

    #region 외래 키
    
    /// <summary>소속 요청 ID (FK → Request.RequestId)</summary>
    [Required]
    public int RequestId { get; set; }
    
    /// <summary>작성자 ID (FK → User.UserId)</summary>
    [Required]
    public int UserId { get; set; }
    
    #endregion

    #region 댓글 내용
    
    /// <summary>
    /// 댓글 내용
    /// </summary>
    /// <remarks>HTML 또는 플레인 텍스트, 길이 제한 없음</remarks>
    [Required]
    public string Content { get; set; } = string.Empty;
    
    /// <summary>
    /// 내부 댓글 여부
    /// </summary>
    /// <remarks>
    /// <para>true: 내부 사용자만 볼 수 있는 메모 (고객 비공개)</para>
    /// <para>false: 고객에게도 표시되는 공개 답변</para>
    /// </remarks>
    public bool IsInternal { get; set; } = false;
    
    #endregion

    #region 감사(Audit) 필드
    
    /// <summary>댓글 작성 일시</summary>
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    #endregion

    #region Navigation Properties (관계 탐색)
    
    /// <summary>소속 요청 정보</summary>
    [ForeignKey("RequestId")]
    public virtual Request Request { get; set; } = null!;
    
    /// <summary>작성자 정보</summary>
    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;
    
    /// <summary>
    /// 이 댓글의 첨부파일 목록
    /// </summary>
    /// <remarks>Attachment.CommentId로 연결</remarks>
    public virtual ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
    
    #endregion
}
