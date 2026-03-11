// ============================================================================
// 파일명: EmailSettings.cs
// 경로: Backend/Models/EmailSettings.cs
// 설명: 이메일 설정(EmailSettings) 엔티티 모델 - SMTP 서버 설정
// ----------------------------------------------------------------------------
// [관련 테이블] EmailSettings (단일 레코드만 존재)
// [유지보수 가이드]
//   - 시스템 전체에서 하나의 설정만 사용 (FirstOrDefault로 조회)
//   - 설정 변경 시 캐시 무효화 필요 (EmailSettingsController 참조)
//   - 비밀번호는 현재 평문 저장 (운영 환경에서는 암호화 권장)
// ============================================================================

using System.ComponentModel.DataAnnotations;

namespace BnfErpPortal.Models;

/// <summary>
/// 이메일 설정(EmailSettings) 엔티티
/// </summary>
/// <remarks>
/// <para>시스템 전체에서 사용하는 SMTP 서버 설정</para>
/// <para>DB에 설정이 없으면 appsettings.json의 Email 섹션 사용</para>
/// <para>⚠️ 테이블에는 하나의 레코드만 존재해야 함</para>
/// </remarks>
public class EmailSettings
{
    #region 기본 키
    
    /// <summary>설정 고유 ID (PK, 항상 1)</summary>
    [Key]
    public int EmailSettingsId { get; set; }
    
    #endregion

    #region SMTP 서버 설정

    /// <summary>
    /// SMTP 서버 호스트
    /// </summary>
    /// <remarks>예: smtp.gmail.com, smtp.naver.com</remarks>
    [Required]
    [MaxLength(200)]
    public string Host { get; set; } = string.Empty;

    /// <summary>
    /// SMTP 포트
    /// </summary>
    /// <remarks>
    /// <para>일반적인 포트:</para>
    /// <para>- 25: 비암호화</para>
    /// <para>- 465: SSL</para>
    /// <para>- 587: TLS (권장)</para>
    /// </remarks>
    public int Port { get; set; } = 587;

    /// <summary>
    /// SSL/TLS 사용 여부
    /// </summary>
    /// <remarks>대부분의 서비스에서 true 권장</remarks>
    public bool EnableSsl { get; set; } = true;
    
    #endregion

    #region 인증 정보

    /// <summary>
    /// SMTP 로그인 사용자 (이메일 주소)
    /// </summary>
    [Required]
    [MaxLength(200)]
    public string User { get; set; } = string.Empty;

    /// <summary>
    /// SMTP 로그인 비밀번호
    /// </summary>
    /// <remarks>⚠️ 현재 평문 저장, 운영 환경에서는 암호화 권장</remarks>
    [Required]
    [MaxLength(500)]
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// 발신자 이메일 주소
    /// </summary>
    /// <remarks>비워두면 User 값을 발신자로 사용</remarks>
    [MaxLength(200)]
    public string FromAddress { get; set; } = string.Empty;
    
    #endregion

    #region 감사(Audit) 필드

    /// <summary>
    /// 마지막 수정 일시
    /// </summary>
    /// <remarks>항상 로컬 시간 사용 (DateTime.Now)</remarks>
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
    
    #endregion
}
