// ============================================================================
// 파일명: RegistrationCode.cs
// 경로: Backend/Models/RegistrationCode.cs
// 설명: 등록 코드(RegistrationCode) 엔티티 모델 - 회원가입 인증 코드
// ----------------------------------------------------------------------------
// [관련 테이블] RegistrationCode
// [관계]
//   - Company (N:1) - 코드가 속한 회사
//   - User (N:1) - 코드 생성자 (내부 사용자)
// [유지보수 가이드]
//   - 회원가입 시 등록 코드 검증 필수
//   - MaxUses로 사용 횟수 제한 가능 (null이면 무제한)
//   - ExpiresAt으로 유효기간 설정 가능
// ============================================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BnfErpPortal.Models;

/// <summary>
/// 등록 코드(RegistrationCode) 엔티티
/// </summary>
/// <remarks>
/// <para>고객 회원가입 시 사용하는 인증 코드</para>
/// <para>코드를 통해 소속 회사, 기본 역할이 자동 설정됨</para>
/// <para>사용 횟수/유효기간 제한으로 보안 강화</para>
/// </remarks>
[Table("RegistrationCode")]
public class RegistrationCode
{
    #region 기본 키
    
    /// <summary>등록 코드 고유 ID (PK, Auto Increment)</summary>
    [Key]
    public int RegistrationCodeId { get; set; }
    
    #endregion

    #region 외래 키
    
    /// <summary>소속 회사 ID (FK → Company.CompanyId)</summary>
    /// <remarks>이 코드로 가입하면 해당 회사에 소속됨</remarks>
    [Required]
    public int CompanyId { get; set; }
    
    /// <summary>코드 생성자 ID (FK → User.UserId)</summary>
    public int CreatedByUserId { get; set; }
    
    #endregion

    #region 코드 정보
    
    /// <summary>
    /// 등록 코드 값 (고유)
    /// </summary>
    /// <remarks>회원가입 시 입력하는 코드</remarks>
    [Required]
    [MaxLength(64)]
    public string Code { get; set; } = string.Empty;
    
    /// <summary>코드 설명 (관리용)</summary>
    [MaxLength(255)]
    public string? Description { get; set; }
    
    #endregion

    #region 사용 제한
    
    /// <summary>
    /// 최대 사용 횟수
    /// </summary>
    /// <remarks>null이면 무제한, 값 있으면 UsedCount와 비교</remarks>
    public int? MaxUses { get; set; }
    
    /// <summary>현재 사용 횟수</summary>
    public int UsedCount { get; set; } = 0;
    
    /// <summary>
    /// 코드 만료 일시
    /// </summary>
    /// <remarks>null이면 만료 없음</remarks>
    public DateTime? ExpiresAt { get; set; }
    
    /// <summary>코드 활성화 여부</summary>
    public bool IsActive { get; set; } = true;
    
    #endregion

    #region 가입자 기본값 설정
    
    /// <summary>
    /// 가입 시 기본 역할
    /// </summary>
    /// <remarks>일반적으로 CUSTOMER, 내부 코드면 ENGINEER 등</remarks>
    [Required]
    [MaxLength(50)]
    public string RoleDefault { get; set; } = nameof(UserRole.CUSTOMER);

    /// <summary>
    /// 가입 시 계정 활성화 여부 기본값
    /// </summary>
    /// <remarks>false면 관리자 승인 후 로그인 가능</remarks>
    public bool UserIsActiveDefault { get; set; } = true;
    
    #endregion

    #region 감사(Audit) 필드
    
    /// <summary>코드 생성 일시</summary>
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    /// <summary>마지막 수정 일시</summary>
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
    
    #endregion

    #region Navigation Properties (관계 탐색)
    
    /// <summary>소속 회사 정보</summary>
    [ForeignKey("CompanyId")]
    public virtual Company Company { get; set; } = null!;
    
    /// <summary>코드 생성자 정보</summary>
    [ForeignKey("CreatedByUserId")]
    public virtual User CreatedBy { get; set; } = null!;
    
    #endregion
}
