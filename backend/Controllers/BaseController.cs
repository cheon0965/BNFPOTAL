// ============================================================================
// 파일명: BaseController.cs
// 경로: Backend/Controllers/BaseController.cs
// 설명: 모든 API 컨트롤러의 기본 클래스 - 공통 헬퍼 메서드 제공
// ----------------------------------------------------------------------------
// [상속 구조]
//   BaseController (추상)
//     ├── AuthController
//     ├── RequestsController
//     ├── CompaniesController
//     └── ... (모든 컨트롤러)
// [유지보수 가이드]
//   - JWT 토큰에서 사용자 정보 추출하는 공통 메서드 제공
//   - 새 컨트롤러 작성 시 반드시 BaseController 상속
//   - 권한 체크 로직은 이 클래스의 메서드 사용 권장
// ============================================================================

using System.Security.Claims;
using BnfErpPortal.Constants;
using Microsoft.AspNetCore.Mvc;

namespace BnfErpPortal.Controllers;

/// <summary>
/// 모든 API 컨트롤러의 기본 클래스
/// </summary>
/// <remarks>
/// <para>JWT 토큰에서 사용자 정보를 추출하는 공통 헬퍼 메서드 제공</para>
/// <para>모든 컨트롤러는 이 클래스를 상속하여 사용</para>
/// </remarks>
[ApiController]
public abstract class BaseController : ControllerBase
{
    #region 사용자 정보 조회 메서드
    
    /// <summary>
    /// 현재 로그인한 사용자의 ID를 가져옵니다.
    /// </summary>
    /// <returns>사용자 ID, 없으면 0</returns>
    /// <remarks>JWT 토큰의 NameIdentifier 클레임에서 추출</remarks>
    protected int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(userIdClaim, out var userId) ? userId : 0;
    }
    
    /// <summary>
    /// 현재 로그인한 사용자의 소속 회사 ID를 가져옵니다.
    /// </summary>
    /// <returns>회사 ID, 없으면 null</returns>
    /// <remarks>JWT 토큰의 CompanyId 클레임에서 추출</remarks>
    protected int? GetCurrentCompanyId()
    {
        var companyIdClaim = User.FindFirst("CompanyId")?.Value;
        return int.TryParse(companyIdClaim, out var companyId) ? companyId : null;
    }
    
    /// <summary>
    /// 현재 로그인한 사용자의 역할을 가져옵니다.
    /// </summary>
    /// <returns>역할 문자열 (ADMIN, MANAGER, ENGINEER, CUSTOMER)</returns>
    /// <remarks>JWT 토큰의 Role 클레임에서 추출</remarks>
    protected string GetCurrentRole()
    {
        return User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
    }
    
    #endregion

    #region 역할 확인 메서드
    
    /// <summary>
    /// 현재 사용자가 내부 사용자(비앤에프소프트 직원)인지 확인합니다.
    /// </summary>
    /// <returns>ADMIN, MANAGER, ENGINEER 중 하나면 true</returns>
    /// <remarks>모든 회사 데이터 접근 가능 여부 판단에 사용</remarks>
    protected bool IsInternalUser()
    {
        var role = GetCurrentRole();
        return UserRoles.IsInternal(role);
    }
    
    /// <summary>
    /// 현재 사용자가 고객 사용자인지 확인합니다.
    /// </summary>
    /// <returns>CUSTOMER면 true</returns>
    /// <remarks>자기 회사 데이터만 접근 가능한지 판단에 사용</remarks>
    protected bool IsCustomerUser()
    {
        var role = GetCurrentRole();
        return UserRoles.IsCustomer(role);
    }
    
    /// <summary>
    /// 현재 사용자가 시스템 관리자인지 확인합니다.
    /// </summary>
    /// <returns>ADMIN이면 true</returns>
    protected bool IsAdmin()
    {
        return GetCurrentRole() == UserRoles.Admin;
    }
    
    #endregion

    #region 회사 소속 확인 메서드
    
    /// <summary>
    /// 현재 사용자가 특정 회사에 소속되어 있는지 확인합니다.
    /// </summary>
    /// <param name="companyId">확인할 회사 ID</param>
    /// <returns>해당 회사 소속이면 true</returns>
    /// <remarks>데이터 접근 권한 검사에 사용</remarks>
    protected bool BelongsToCompany(int companyId)
    {
        var currentCompanyId = GetCurrentCompanyId();
        return currentCompanyId.HasValue && currentCompanyId.Value == companyId;
    }
    
    /// <summary>
    /// 현재 사용자가 비앤에프소프트(내부 회사)에 소속되어 있는지 확인합니다.
    /// </summary>
    /// <returns>CompanyId가 1이면 true</returns>
    /// <remarks>BnfCompany.CompanyId 상수 사용</remarks>
    protected bool IsBnfCompany()
    {
        return BelongsToCompany(BnfCompany.CompanyId);
    }
    
    #endregion
}
