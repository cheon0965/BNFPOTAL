// ============================================================================
// 파일명: AuditLogService.cs
// 경로: Backend/Services/AuditLogService.cs
// 설명: 감사 로그 기록 인터페이스의 실제 기능 구현체 (DB 연동)
// ============================================================================

using System;
using System.Threading.Tasks;
using BnfErpPortal.Data;
using BnfErpPortal.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace BnfErpPortal.Services
{
    public class AuditLogService : IAuditLogService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<AuditLogService> _logger;

        // 메인 로직의 트랜잭션 등과 독립적으로 로그를 쌓기 위해 IServiceProvider를 통한 스코프 생성
        public AuditLogService(IServiceProvider serviceProvider, ILogger<AuditLogService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        public async Task LogActionAsync(int userId, string entityType, int entityId, string action, string? oldValue = null, string? newValue = null)
        {
            try
            {
                // Fire and Forget을 위해 백그라운드 태스크로 실행
                _ = Task.Run(async () =>
                {
                    try
                    {
                        using var scope = _serviceProvider.CreateScope();
                        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                        var log = new AuditLog
                        {
                            UserId = userId,
                            EntityType = entityType,
                            EntityId = entityId,
                            Action = action,
                            OldValue = oldValue,
                            NewValue = newValue,
                            CreatedAt = DateTime.Now
                        };

                        context.AuditLogs.Add(log);
                        await context.SaveChangesAsync();
                    }
                    catch (Exception ex)
                    {
                        // 로깅 자체의 실패가 주 흐름을 방해해서는 안 되므로 잡아서 시스템 콘솔 로거로만 남김
                        _logger.LogError(ex, "감사 로그 저장 실패 (DB 저장 중 에러 발생) - EntityType: {EntityType}, Action: {Action}", entityType, action);
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "감사 로그 백그라운드 태스크 초기화 실패");
            }
            
            await Task.CompletedTask;
        }
    }
}
