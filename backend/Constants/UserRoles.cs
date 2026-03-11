// ============================================================================
// 파일명: UserRoles.cs
// 경로: Backend/Constants/UserRoles.cs
// 설명: 사용자 역할(Role) 및 회사 관련 상수 정의
// ----------------------------------------------------------------------------
// [유지보수 가이드]
// 1. 새 역할 추가 시: 상수 추가 → InternalRoles/CustomerRoles 배열 수정 → AllRoles 배열 수정
// 2. 역할 값은 DB와 동기화 필요 (대문자 영문 사용)
// 3. Frontend의 constants/index.js 의 USER_ROLES와 동일하게 유지할 것
// ============================================================================

namespace BnfErpPortal.Constants;

/// <summary>
/// 사용자 역할(Role) 상수 정의
/// </summary>
/// <remarks>
/// <para>역할 체계:</para>
/// <list type="bullet">
///   <item><description>내부 사용자: ADMIN, MANAGER, ENGINEER (비앤에프소프트 직원)</description></item>
///   <item><description>외부 사용자: CUSTOMER (고객사 직원)</description></item>
/// </list>
/// <para>권한 우선순위: ADMIN > MANAGER > ENGINEER > CUSTOMER</para>
/// </remarks>
public static class UserRoles
{
    #region 역할 상수 정의
    
    // ─────────────────────────────────────────────────────────────────────────
    // 내부 사용자 역할 (비앤에프소프트 소속)
    // ─────────────────────────────────────────────────────────────────────────
    
    /// <summary>시스템 관리자 - 모든 기능 접근 가능, 시스템 설정 관리</summary>
    public const string Admin = "ADMIN";
    
    /// <summary>매니저 - 요청 관리, 담당자 배정, 통계 조회</summary>
    public const string Manager = "MANAGER";
    
    /// <summary>엔지니어 - 요청 처리, 답변 작성</summary>
    public const string Engineer = "ENGINEER";

    // ─────────────────────────────────────────────────────────────────────────
    // 외부 사용자 역할 (고객사 소속)
    // ─────────────────────────────────────────────────────────────────────────
    
    /// <summary>고객 - 자사 요청 등록/조회, 답변 확인</summary>
    public const string Customer = "CUSTOMER";
    
    #endregion

    #region 역할 그룹 배열
    
    /// <summary>
    /// 내부 사용자 역할 목록
    /// </summary>
    /// <remarks>관리자 페이지 접근 권한 판단에 사용</remarks>
    public static readonly string[] InternalRoles = 
    {
        Admin, Manager, Engineer
    };

    /// <summary>
    /// 고객 역할 목록
    /// </summary>
    /// <remarks>회사별 데이터 필터링 적용 대상</remarks>
    public static readonly string[] CustomerRoles = 
    {
        Customer
    };

    /// <summary>
    /// 모든 유효한 역할 목록
    /// </summary>
    /// <remarks>회원가입/역할 변경 시 유효성 검사에 사용</remarks>
    public static readonly string[] AllRoles =
    {
        Admin, Manager, Engineer, Customer
    };
    
    #endregion

    #region 역할 판단 헬퍼 메서드
    
    /// <summary>
    /// 내부 사용자(비앤에프소프트 직원) 여부 확인
    /// </summary>
    /// <param name="role">확인할 역할 문자열</param>
    /// <returns>내부 사용자이면 true</returns>
    /// <example>
    /// <code>
    /// if (UserRoles.IsInternal(user.Role)) {
    ///     // 모든 회사 데이터 접근 가능
    /// }
    /// </code>
    /// </example>
    public static bool IsInternal(string role) => 
        Array.Exists(InternalRoles, r => r == role);

    /// <summary>
    /// 고객(외부 사용자) 여부 확인
    /// </summary>
    /// <param name="role">확인할 역할 문자열</param>
    /// <returns>고객이면 true</returns>
    public static bool IsCustomer(string role) => 
        role == Customer;

    /// <summary>
    /// 유효한 역할 값인지 확인
    /// </summary>
    /// <param name="role">확인할 역할 문자열</param>
    /// <returns>유효하면 true</returns>
    /// <remarks>회원가입, 역할 변경 API에서 검증용으로 사용</remarks>
    public static bool IsValid(string role) => 
        Array.Exists(AllRoles, r => r == role);
    
    #endregion
}

/// <summary>
/// 비앤에프소프트 회사 정보 상수
/// </summary>
/// <remarks>
/// <para>시드 데이터로 생성되는 내부 회사 정보</para>
/// <para>내부 사용자 판별, 알림 발송 대상 조회 등에 사용</para>
/// <para>⚠️ 주의: DB의 Companies 테이블 시드 데이터와 일치해야 함</para>
/// </remarks>
public static class BnfCompany
{
    /// <summary>비앤에프소프트 회사 ID (DB 기본 키)</summary>
    public const int CompanyId = 1;
    
    /// <summary>비앤에프소프트 회사 코드</summary>
    public const string CompanyCode = "BNFSOFT";
}
