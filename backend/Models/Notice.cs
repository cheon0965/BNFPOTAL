// ============================================================================
// 파일명: Notice.cs
// 경로: Backend/Models/Notice.cs
// 설명: 공지사항(Notice) 엔티티 모델 - 시스템 공지 관리
// ----------------------------------------------------------------------------
// [관련 테이블] Notice
// [관계]
//   - User (N:1) - 작성자
//   - NoticeAttachment (1:N) - 첨부파일
// [유지보수 가이드]
//   - IsPinned=true인 공지는 목록 상단에 고정 표시
//   - ViewCount는 조회 시 자동 증가 (중복 방지 로직 별도)
// ============================================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BnfErpPortal.Models;

/// <summary>
/// 공지사항(Notice) 엔티티
/// </summary>
/// <remarks>
/// <para>시스템 전체 공지사항 관리</para>
/// <para>내부 사용자만 작성 가능, 모든 사용자 조회 가능</para>
/// </remarks>
[Table("Notice")]
public class Notice
{
    #region 기본 키
    
    /// <summary>공지사항 고유 ID (PK, Auto Increment)</summary>
    [Key]
    public int NoticeId { get; set; }
    
    #endregion

    #region 공지 내용
    
    /// <summary>공지 제목</summary>
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;
    
    /// <summary>공지 내용 (HTML 또는 플레인 텍스트)</summary>
    [Required]
    public string Content { get; set; } = string.Empty;
    
    #endregion

    #region 표시 설정
    
    /// <summary>상단 고정 여부</summary>
    public bool IsPinned { get; set; } = false;
    
    /// <summary>공개 여부</summary>
    public bool IsActive { get; set; } = true;
    
    /// <summary>조회수</summary>
    public int ViewCount { get; set; } = 0;
    
    #endregion

    #region 외래 키 및 감사 필드
    
    /// <summary>작성자 ID (FK → User.UserId)</summary>
    [Required]
    public int CreatedByUserId { get; set; }
    
    /// <summary>작성 일시</summary>
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    /// <summary>수정 일시</summary>
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
    
    #endregion

    #region Navigation Properties
    
    /// <summary>작성자 정보</summary>
    [ForeignKey("CreatedByUserId")]
    public virtual User CreatedBy { get; set; } = null!;
    
    /// <summary>첨부파일 목록</summary>
    public virtual ICollection<NoticeAttachment> Attachments { get; set; } = new List<NoticeAttachment>();
    
    #endregion
}
