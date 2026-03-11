// ============================================================================
// 파일명: User.cs
// 경로: Backend/Models/User.cs
// 설명: 사용자 엔티티 모델 - 시스템 사용자 정보 정의
// ----------------------------------------------------------------------------
// [관련 테이블] User
// [관계]
//   - Company (N:1) - 소속 회사
//   - Request (1:N) - 생성한 요청들, 담당 요청들
//   - RequestComment (1:N) - 작성한 댓글들
//   - RegistrationCode (1:N) - 생성한 등록 코드들
// [유지보수 가이드]
//   - 필드 추가 시 DTO(UserDto, AuthDTOs)도 함께 수정
//   - Role 값은 UserRoles 상수 사용 (문자열 직접 사용 금지)
// ============================================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BnfErpPortal.Models;

/// <summary>
/// 사용자 역할 열거형 (참조용)
/// </summary>
/// <remarks>
/// 실제 DB 저장은 문자열(Role 프로퍼티)로 저장됨
/// UserRoles 상수 클래스와 동기화 필요
/// </remarks>
public enum UserRole
{
    /// <summary>고객 사용자</summary>
    CUSTOMER,
    /// <summary>엔지니어</summary>
    ENGINEER,
    /// <summary>매니저</summary>
    MANAGER,
    /// <summary>시스템 관리자</summary>
    ADMIN
}

/// <summary>
/// 사용자(User) 엔티티
/// </summary>
/// <remarks>
/// <para>인증 및 권한 관리의 핵심 엔티티</para>
/// <para>비밀번호는 BCrypt 해시로 저장</para>
/// </remarks>
[Table("User")]
public class User
{
    #region 기본 키
    
    /// <summary>사용자 고유 ID (PK, Auto Increment)</summary>
    [Key]
    public int UserId { get; set; }
    
    #endregion

    #region 외래 키
    
    /// <summary>
    /// 소속 회사 ID (FK → Company.CompanyId)
    /// </summary>
    /// <remarks>내부 사용자는 CompanyId = 1 (비앤에프소프트)</remarks>
    public int? CompanyId { get; set; }
    
    #endregion

    #region 인증 정보
    
    /// <summary>
    /// 이메일 주소 (로그인 ID로 사용)
    /// </summary>
    /// <remarks>시스템 전체에서 고유해야 함 (Unique Index)</remarks>
    [Required]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;
    
    /// <summary>
    /// 비밀번호 해시 (BCrypt)
    /// </summary>
    /// <remarks>평문 비밀번호 저장 금지, BCrypt.HashPassword() 사용</remarks>
    [Required]
    [MaxLength(255)]
    public string PasswordHash { get; set; } = string.Empty;
    
    #endregion

    #region 사용자 정보
    
    /// <summary>사용자 이름</summary>
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    /// <summary>연락처 (선택)</summary>
    [MaxLength(50)]
    public string? PhoneNumber { get; set; }
    
    /// <summary>
    /// 사용자 역할
    /// </summary>
    /// <remarks>
    /// <para>허용 값: ADMIN, MANAGER, ENGINEER, CUSTOMER</para>
    /// <para>UserRoles 상수 클래스 참조</para>
    /// </remarks>
    [Required]
    [MaxLength(50)]
    public string Role { get; set; } = nameof(UserRole.CUSTOMER);
    
    /// <summary>
    /// 계정 활성화 여부
    /// </summary>
    /// <remarks>false 시 로그인 차단</remarks>
    public bool IsActive { get; set; } = true;
    
    #endregion

    #region 감사(Audit) 필드
    
    /// <summary>계정 생성 일시</summary>
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    /// <summary>마지막 로그인 일시</summary>
    public DateTime? LastLoginAt { get; set; }
    
    #endregion

    #region Navigation Properties (관계 탐색)
    
    /// <summary>소속 회사 정보</summary>
    [ForeignKey("CompanyId")]
    public virtual Company? Company { get; set; }
    
    /// <summary>이 사용자가 생성한 요청 목록</summary>
    public virtual ICollection<Request> CreatedRequests { get; set; } = new List<Request>();
    
    /// <summary>이 사용자가 담당하는 요청 목록</summary>
    public virtual ICollection<Request> AssignedRequests { get; set; } = new List<Request>();
    
    /// <summary>이 사용자가 작성한 댓글 목록</summary>
    public virtual ICollection<RequestComment> Comments { get; set; } = new List<RequestComment>();
    
    /// <summary>이 사용자가 생성한 등록 코드 목록 (내부 사용자 전용)</summary>
    public virtual ICollection<RegistrationCode> CreatedRegistrationCodes { get; set; } = new List<RegistrationCode>();
    
    #endregion
}
