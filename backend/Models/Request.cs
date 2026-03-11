// ============================================================================
// 파일명: Request.cs
// 경로: Backend/Models/Request.cs
// 설명: 유지보수 요청(Request) 엔티티 모델 - 핵심 비즈니스 엔티티
// ----------------------------------------------------------------------------
// [관련 테이블] Request
// [관계]
//   - Company (N:1) - 요청한 회사
//   - ErpSystem (N:1) - 관련 ERP 시스템
//   - User (N:1) - 요청 생성자, 담당자
//   - RequestComment (1:N) - 댓글/답변
//   - Attachment (1:N) - 첨부파일
// [유지보수 가이드]
//   - 상태/우선순위/카테고리 추가 시 RequestConstants와 동기화
//   - DTO(RequestDto, CreateRequestRequest 등)도 함께 수정
// ============================================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BnfErpPortal.Models;

#region 열거형 정의 (참조용)

/// <summary>
/// 요청 카테고리 열거형 (참조용)
/// </summary>
/// <remarks>실제 DB 저장은 문자열, RequestCategory 상수 클래스 참조</remarks>
public enum RequestCategory
{
    /// <summary>버그/오류 리포트</summary>
    BUG,
    /// <summary>사용법/기능 문의</summary>
    QUESTION,
    /// <summary>기능 개선 요청</summary>
    IMPROVEMENT
}

/// <summary>
/// 요청 우선순위 열거형 (참조용)
/// </summary>
/// <remarks>실제 DB 저장은 문자열, RequestPriority 상수 클래스 참조</remarks>
public enum RequestPriority
{
    /// <summary>낮음 - 여유 있게 처리</summary>
    LOW,
    /// <summary>보통 - 일반 요청 (기본값)</summary>
    MEDIUM,
    /// <summary>높음 - 중요 요청</summary>
    HIGH,
    /// <summary>긴급 - 즉시 처리 필요 (전체 알림)</summary>
    CRITICAL
}

/// <summary>
/// 요청 상태 열거형 (참조용)
/// </summary>
/// <remarks>실제 DB 저장은 문자열, RequestStatus 상수 클래스 참조</remarks>
public enum RequestStatus
{
    /// <summary>전달 - 새 요청이 등록됨</summary>
    SUBMITTED,
    /// <summary>담당자 배정 - 담당자가 배정됨</summary>
    ASSIGNED,
    /// <summary>처리중 - 처리가 시작됨</summary>
    IN_PROGRESS,
    /// <summary>중간답변완료 - 내부 사용자가 외부 댓글 달면 자동 변경</summary>
    INTERIM_REPLIED,
    /// <summary>완료 - 처리 완료</summary>
    COMPLETED
}

#endregion

/// <summary>
/// 유지보수 요청(Request) 엔티티
/// </summary>
/// <remarks>
/// <para>ERP 포털의 핵심 비즈니스 엔티티</para>
/// <para>고객이 등록한 문의/버그/개선요청을 관리</para>
/// <para>상태 흐름: SUBMITTED → ASSIGNED → IN_PROGRESS → INTERIM_REPLIED → COMPLETED</para>
/// </remarks>
[Table("Request")]
public class Request
{
    #region 기본 키
    
    /// <summary>요청 고유 ID (PK, Auto Increment)</summary>
    [Key]
    public int RequestId { get; set; }
    
    #endregion

    #region 외래 키
    
    /// <summary>
    /// 요청 회사 ID (FK → Company.CompanyId)
    /// </summary>
    /// <remarks>요청을 등록한 회사 (고객사)</remarks>
    [Required]
    public int CompanyId { get; set; }
    
    /// <summary>
    /// 관련 ERP 시스템 ID (FK → ErpSystem.ErpSystemId)
    /// </summary>
    /// <remarks>문제가 발생한 ERP 시스템 (선택)</remarks>
    public int? ErpSystemId { get; set; }
    
    /// <summary>
    /// 요청 생성자 ID (FK → User.UserId)
    /// </summary>
    [Required]
    public int CreatedByUserId { get; set; }
    
    /// <summary>
    /// 담당자 ID (FK → User.UserId)
    /// </summary>
    /// <remarks>배정된 엔지니어, null이면 미배정 상태</remarks>
    public int? AssignedToUserId { get; set; }
    
    #endregion

    #region 요청 내용
    
    /// <summary>요청 제목</summary>
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;
    
    /// <summary>
    /// 요청 상세 내용
    /// </summary>
    /// <remarks>HTML 또는 플레인 텍스트, 길이 제한 없음</remarks>
    [Required]
    public string Content { get; set; } = string.Empty;
    
    #endregion

    #region 분류 정보
    
    /// <summary>
    /// 카테고리 (BUG, QUESTION, IMPROVEMENT)
    /// </summary>
    /// <remarks>RequestCategory 상수 클래스 참조</remarks>
    [Required]
    [MaxLength(50)]
    public string Category { get; set; } = nameof(RequestCategory.QUESTION);
    
    /// <summary>
    /// 우선순위 (LOW, MEDIUM, HIGH, CRITICAL)
    /// </summary>
    /// <remarks>
    /// <para>RequestPriority 상수 클래스 참조</para>
    /// <para>CRITICAL 선택 시 내부 전체 알림 발송</para>
    /// </remarks>
    [Required]
    [MaxLength(50)]
    public string Priority { get; set; } = nameof(RequestPriority.MEDIUM);
    
    /// <summary>
    /// 처리 상태 (SUBMITTED → COMPLETED)
    /// </summary>
    /// <remarks>RequestStatus 상수 클래스 참조</remarks>
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = nameof(RequestStatus.SUBMITTED);
    
    #endregion

    #region 일정 정보
    
    /// <summary>처리 예정일 (선택)</summary>
    public DateTime? DueDate { get; set; }
    
    #endregion

    #region 감사(Audit) 필드
    
    /// <summary>요청 생성 일시</summary>
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    /// <summary>마지막 수정 일시</summary>
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
    
    /// <summary>
    /// 완료 일시
    /// </summary>
    /// <remarks>Status가 COMPLETED로 변경될 때 자동 기록</remarks>
    public DateTime? ClosedAt { get; set; }
    
    #endregion

    #region Navigation Properties (관계 탐색)
    
    /// <summary>요청 회사 정보</summary>
    [ForeignKey("CompanyId")]
    public virtual Company Company { get; set; } = null!;
    
    /// <summary>관련 ERP 시스템 정보</summary>
    [ForeignKey("ErpSystemId")]
    public virtual ErpSystem? ErpSystem { get; set; }
    
    /// <summary>요청 생성자 정보</summary>
    [ForeignKey("CreatedByUserId")]
    public virtual User CreatedBy { get; set; } = null!;
    
    /// <summary>담당자 정보</summary>
    [ForeignKey("AssignedToUserId")]
    public virtual User? AssignedTo { get; set; }
    
    /// <summary>이 요청의 댓글/답변 목록</summary>
    public virtual ICollection<RequestComment> Comments { get; set; } = new List<RequestComment>();
    
    /// <summary>이 요청의 첨부파일 목록 (요청 레벨)</summary>
    public virtual ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
    
    #endregion
}
