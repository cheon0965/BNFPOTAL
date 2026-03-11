// ============================================================================
// 파일명: EmailTemplate.cs
// 경로: Backend/Models/EmailTemplate.cs
// 설명: 이메일 템플릿(EmailTemplate) 엔티티 모델 - 발송 메일 양식
// ----------------------------------------------------------------------------
// [관련 테이블] EmailTemplate
// [유지보수 가이드]
//   - 템플릿에서 사용 가능한 변수: {UserName}, {RequestTitle}, {NewStatus} 등
//   - 새 이벤트 추가 시 TemplateKey 추가 및 시드 데이터 생성
//   - 변수 치환은 EmailTemplateService.RenderAsync()에서 수행
// ============================================================================

using System.ComponentModel.DataAnnotations;

namespace BnfErpPortal.Models;

/// <summary>
/// 이메일 템플릿(EmailTemplate) 엔티티
/// </summary>
/// <remarks>
/// <para>시스템에서 발송하는 이메일의 제목/본문 양식 관리</para>
/// <para>변수 치환을 통해 동적 내용 생성</para>
/// <para>지원 변수: {UserName}, {RequestTitle}, {OldStatus}, {NewStatus}, {Reason}, {RequestLink}</para>
/// </remarks>
public class EmailTemplate
{
    #region 기본 키
    
    /// <summary>템플릿 고유 ID (PK, Auto Increment)</summary>
    [Key]
    public int EmailTemplateId { get; set; }
    
    #endregion

    #region 템플릿 식별
    
    /// <summary>
    /// 템플릿 식별 키 (고유)
    /// </summary>
    /// <remarks>
    /// <para>코드에서 참조하는 키 값:</para>
    /// <para>- REQUEST_STATUS_CHANGED: 상태 변경 알림</para>
    /// <para>- REQUEST_INTERIM_REPLY: 중간 답변 알림</para>
    /// </remarks>
    [Required]
    [MaxLength(100)]
    public string TemplateKey { get; set; } = string.Empty;

    /// <summary>관리자 화면용 템플릿 이름</summary>
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    #endregion

    #region 템플릿 내용

    /// <summary>
    /// 메일 제목 템플릿
    /// </summary>
    /// <remarks>예: [BnF ERP] 요청 '{RequestTitle}'의 상태가 변경되었습니다</remarks>
    [Required]
    public string SubjectTemplate { get; set; } = string.Empty;

    /// <summary>
    /// 메일 본문 템플릿
    /// </summary>
    /// <remarks>
    /// <para>줄바꿈은 렌더링 시 &lt;br /&gt;로 변환됨</para>
    /// <para>{RequestLink}는 클릭 가능한 링크로 변환됨</para>
    /// </remarks>
    [Required]
    public string BodyTemplate { get; set; } = string.Empty;
    
    /// <summary>해당 템플릿의 메일 발송 사용 여부</summary>
    public bool IsEnabled { get; set; } = true;
    
    #endregion

    #region 감사(Audit) 필드

    /// <summary>마지막 수정 일시</summary>
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
    
    #endregion
}
