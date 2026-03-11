// ============================================================================
// 파일명: AuthorizationPolicies.cs
// 경로: Backend/Constants/AuthorizationPolicies.cs
// 설명: ASP.NET Core 정책 기반 권한 부여(Policy-Based Authorization) 이름 상수
// ----------------------------------------------------------------------------
// [유지보수 가이드]
// 1. 새 정책 추가 시: 상수 추가 → Program.cs에서 AddPolicy() 호출 추가
// 2. 컨트롤러에서 사용: [Authorize(Policy = AuthorizationPolicies.정책명)]
// 3. 정책별 허용 역할 변경은 Program.cs의 AddAuthorization 블록에서 수정
// ============================================================================

namespace BnfErpPortal.Constants;

/// <summary>
/// 정책 기반 권한 부여(Authorization Policy) 이름 상수
/// </summary>
/// <remarks>
/// <para>정책 기반 권한의 장점:</para>
/// <list type="bullet">
///   <item><description>역할 조합을 정책으로 그룹화하여 관리 용이</description></item>
///   <item><description>Program.cs에서 정책 구성만 변경하면 전체 적용</description></item>
///   <item><description>컨트롤러 코드 변경 없이 권한 체계 수정 가능</description></item>
/// </list>
/// <para>정책 구성 위치: Program.cs의 builder.Services.AddAuthorization() 블록</para>
/// </remarks>
/// <example>
/// <code>
/// // 컨트롤러에서 사용 예시
/// [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
/// public class AdminController : ControllerBase { }
/// </code>
/// </example>
public static class AuthorizationPolicies
{
    /// <summary>
    /// 시스템 관리 권한
    /// </summary>
    /// <remarks>
    /// <para>허용 역할: ADMIN, MANAGER, ENGINEER</para>
    /// <para>용도: 시스템 설정, 사용자 관리, 회사 관리 등</para>
    /// <para>향후 ADMIN만 허용하도록 변경 가능 (Program.cs 수정)</para>
    /// </remarks>
    public const string AdminOnly = "AdminOnly";

    /// <summary>
    /// 관리자/매니저 공통 관리 기능
    /// </summary>
    /// <remarks>
    /// <para>허용 역할: ADMIN, MANAGER, ENGINEER (현재 AdminOnly와 동일)</para>
    /// <para>용도: 이메일 설정, 이메일 템플릿 관리 등</para>
    /// <para>향후 ENGINEER 제외 시 이 정책만 수정하면 됨</para>
    /// </remarks>
    public const string AdminOrManager = "AdminOrManager";

    /// <summary>
    /// 내부 운영자 전체 (비앤에프소프트 직원)
    /// </summary>
    /// <remarks>
    /// <para>허용 역할: ADMIN, MANAGER, ENGINEER</para>
    /// <para>용도: 요청 담당자 배정, 모든 회사 데이터 조회 등</para>
    /// </remarks>
    public const string InternalStaff = "InternalStaff";
}
