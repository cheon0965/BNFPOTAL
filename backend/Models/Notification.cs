// ============================================================================
// 파일명: Notification.cs
// 경로: Backend/Models/Notification.cs
// 설명: 알림(Notification) 엔티티 모델 - 사용자별 알림 관리
// ----------------------------------------------------------------------------
// [관련 테이블] Notification
// [관계]
//   - User (N:1) - 알림 수신자
//   - Request (N:1, 선택) - 관련 요청
// [유지보수 가이드]
//   - 새 알림 타입 추가 시 Type 값 일관성 유지
//   - 알림은 생성만 되고 수정되지 않음 (IsRead만 업데이트)
// ============================================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BnfErpPortal.Models;

/// <summary>
/// 알림(Notification) 엔티티
/// </summary>
/// <remarks>
/// <para>사용자에게 발송되는 시스템 알림을 관리</para>
/// <para>요청 상태 변경, 새 댓글, 긴급 요청 등의 이벤트에서 생성</para>
/// </remarks>
public class Notification
{
    #region 기본 키
    
    /// <summary>알림 고유 ID (PK, Auto Increment)</summary>
    [Key]
    public int NotificationId { get; set; }
    
    #endregion

    #region 외래 키
    
    /// <summary>알림 수신자 ID (FK → User.UserId)</summary>
    public int UserId { get; set; }
    
    /// <summary>
    /// 관련 요청 ID (FK → Request.RequestId)
    /// </summary>
    /// <remarks>요청과 무관한 알림은 null</remarks>
    public int? RequestId { get; set; }
    
    #endregion

    #region 알림 내용
    
    /// <summary>알림 메시지</summary>
    [Required]
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// 알림 유형
    /// </summary>
    /// <remarks>
    /// <para>STATUS_CHANGE: 요청 상태 변경</para>
    /// <para>COMMENT: 새 댓글 등록</para>
    /// <para>URGENT_REQUEST: 긴급 요청 등록</para>
    /// </remarks>
    [Required]
    public string Type { get; set; } = "STATUS_CHANGE";

    /// <summary>읽음 여부</summary>
    public bool IsRead { get; set; } = false;
    
    #endregion

    #region 감사(Audit) 필드
    
    /// <summary>알림 생성 일시</summary>
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    #endregion

    #region Navigation Properties (관계 탐색)
    
    /// <summary>알림 수신자 정보</summary>
    [ForeignKey("UserId")]
    public User User { get; set; } = null!;
    
    /// <summary>관련 요청 정보</summary>
    [ForeignKey("RequestId")]
    public Request? Request { get; set; }
    
    #endregion
}
