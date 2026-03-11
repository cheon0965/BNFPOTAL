// ============================================================================
// 파일명: IAuditLogService.cs
// 경로: Backend/Services/IAuditLogService.cs
// 설명: 감사 로그를 기록하기 위한 인터페이스
// ============================================================================

using System.Threading.Tasks;

namespace BnfErpPortal.Services
{
    public interface IAuditLogService
    {
        /// <summary>
        /// 시스템 감사 로그를 기록합니다. 
        /// 내부적으로 예외가 발생하더라도 메인 비즈니스 로직에 영향을 주지 않도록 설계되었습니다.
        /// </summary>
        /// <param name="userId">이벤트를 발생시킨 사용자 ID</param>
        /// <param name="entityType">타겟 엔티티 종류 (예: "AUTH", "REQUEST", "USER")</param>
        /// <param name="entityId">타겟 엔티티 ID</param>
        /// <param name="action">수행 액션 (예: "LOGIN_SUCCESS", "CREATE", "UPDATE", "STATUS_CHANGE")</param>
        /// <param name="oldValue">변경 전 데이터 (선택)</param>
        /// <param name="newValue">변경 후 데이터 (선택)</param>
        Task LogActionAsync(int userId, string entityType, int entityId, string action, string? oldValue = null, string? newValue = null);
    }
}
