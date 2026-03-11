// ============================================================================
// 파일명: Company.cs
// 경로: Backend/Models/Company.cs
// 설명: 회사(Company) 엔티티 모델 - 멀티테넌시 기준 엔티티
// ----------------------------------------------------------------------------
// [관련 테이블] Company
// [관계]
//   - User (1:N) - 소속 사용자들
//   - ErpSystem (1:N) - 사용 중인 ERP 시스템들
//   - Request (1:N) - 등록한 요청들
//   - RegistrationCode (1:N) - 발급된 등록 코드들
// [유지보수 가이드]
//   - CompanyId = 1은 비앤에프소프트 (BnfCompany 상수 참조)
//   - 회사 삭제 시 하위 데이터 처리 정책 확인 필요
// ============================================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BnfErpPortal.Models;

/// <summary>
/// 회사(Company) 엔티티
/// </summary>
/// <remarks>
/// <para>멀티테넌시의 기준이 되는 엔티티</para>
/// <para>고객 사용자는 자신의 CompanyId에 해당하는 데이터만 접근 가능</para>
/// <para>⚠️ CompanyId = 1은 비앤에프소프트 (내부 회사, 삭제 금지)</para>
/// </remarks>
[Table("Company")]
public class Company
{
    #region 기본 키
    
    /// <summary>회사 고유 ID (PK, Auto Increment)</summary>
    /// <remarks>CompanyId = 1은 비앤에프소프트 (BnfCompany.CompanyId)</remarks>
    [Key]
    public int CompanyId { get; set; }
    
    #endregion

    #region 회사 정보
    
    /// <summary>회사명</summary>
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// 회사 코드 (고유)
    /// </summary>
    /// <remarks>
    /// <para>회원가입 시 등록 코드와 매칭에 사용</para>
    /// <para>예: BNFSOFT, CUSTOMER001</para>
    /// </remarks>
    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;
    
    /// <summary>대표 연락처</summary>
    [MaxLength(50)]
    public string? PhoneNumber { get; set; }
    
    /// <summary>
    /// 활성화 여부
    /// </summary>
    /// <remarks>false 시 해당 회사 사용자 로그인 차단 가능</remarks>
    public bool IsActive { get; set; } = true;
    
    #endregion

    #region 감사(Audit) 필드
    
    /// <summary>회사 등록 일시</summary>
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    /// <summary>마지막 수정 일시</summary>
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
    
    #endregion

    #region Navigation Properties (관계 탐색)
    
    /// <summary>이 회사에 소속된 사용자 목록</summary>
    public virtual ICollection<User> Users { get; set; } = new List<User>();
    
    /// <summary>이 회사가 사용하는 ERP 시스템 목록</summary>
    public virtual ICollection<ErpSystem> ErpSystems { get; set; } = new List<ErpSystem>();
    
    /// <summary>이 회사가 등록한 요청 목록</summary>
    public virtual ICollection<Request> Requests { get; set; } = new List<Request>();
    
    /// <summary>이 회사에 발급된 등록 코드 목록</summary>
    public virtual ICollection<RegistrationCode> RegistrationCodes { get; set; } = new List<RegistrationCode>();
    
    #endregion
}
