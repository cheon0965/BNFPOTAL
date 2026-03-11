// ============================================================================
// 파일명: NoticeView.cs
// 경로: Backend/Models/NoticeView.cs
// 설명: 공지사항 조회 기록(NoticeView) 엔티티 - 사용자별 조회 이력
// ----------------------------------------------------------------------------
// [관련 테이블] NoticeView
// [용도] 공지사항 조회수 중복 방지, 읽음 상태 확인
// ============================================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BnfErpPortal.Models;

/// <summary>
/// 공지사항 조회 기록(NoticeView) 엔티티
/// </summary>
/// <remarks>사용자별 공지사항 조회 여부 추적용</remarks>
[Table("NoticeView")]
public class NoticeView
{
    /// <summary>조회 기록 고유 ID (PK)</summary>
    [Key]
    public int NoticeViewId { get; set; }

    /// <summary>공지사항 ID (FK)</summary>
    [Required]
    public int NoticeId { get; set; }

    /// <summary>조회한 사용자 ID (FK)</summary>
    [Required]
    public int UserId { get; set; }

    /// <summary>조회 일시</summary>
    public DateTime ViewedAt { get; set; } = DateTime.Now;

    /// <summary>공지사항 정보</summary>
    [ForeignKey("NoticeId")]
    public virtual Notice Notice { get; set; } = null!;

    /// <summary>조회한 사용자 정보</summary>
    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;
}
