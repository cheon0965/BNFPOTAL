// ============================================================================
// 파일명: RefreshTokenCleanupService.cs
// 경로: Backend/Services/RefreshTokenCleanupService.cs
// 설명: 만료되거나 폐기된 RefreshToken을 주기적으로 정리하는 백그라운드 서비스
// ----------------------------------------------------------------------------
// [동작 방식]
//   - 매 24시간(설정 가능)마다 실행
//   - 만료된 토큰 또는 폐기된(IsRevoked=true) 토큰 삭제
//   - 삭제된 토큰 수를 로그로 기록
//
// [유지보수 가이드]
//   - 정리 주기 변경: CleanupIntervalHours 조정
//   - 삭제 조건 변경: ExecuteAsync 내 Where 조건 수정
// ============================================================================

using Microsoft.EntityFrameworkCore;
using BnfErpPortal.Data;

namespace BnfErpPortal.Services;

/// <summary>
/// 만료/폐기된 RefreshToken 자동 정리 서비스
/// </summary>
/// <remarks>
/// <para>주기적으로 실행되어 DB 크기 증가를 방지</para>
/// <para>애플리케이션 시작 시 자동으로 등록됨</para>
/// </remarks>
public class RefreshTokenCleanupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<RefreshTokenCleanupService> _logger;
    
    /// <summary>
    /// 정리 작업 실행 간격 (시간)
    /// </summary>
    private const int CleanupIntervalHours = 24;
    
    public RefreshTokenCleanupService(
        IServiceProvider serviceProvider,
        ILogger<RefreshTokenCleanupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("RefreshToken 정리 서비스 시작됨. 실행 간격: {Hours}시간", CleanupIntervalHours);
        
        // 서비스 시작 후 1분 대기 (앱 시작 시 부하 분산)
        await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupExpiredTokensAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RefreshToken 정리 중 오류 발생");
            }
            
            // 다음 실행까지 대기
            await Task.Delay(TimeSpan.FromHours(CleanupIntervalHours), stoppingToken);
        }
    }
    
    /// <summary>
    /// 만료되거나 폐기된 토큰 삭제
    /// </summary>
    private async Task CleanupExpiredTokensAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        
        var now = DateTime.Now;
        
        // 만료되었거나 폐기된 토큰 조회
        var expiredTokens = await context.RefreshTokens
            .Where(rt => rt.ExpiresAt < now || rt.IsRevoked)
            .ToListAsync(stoppingToken);
        
        if (expiredTokens.Count == 0)
        {
            _logger.LogDebug("정리할 RefreshToken이 없습니다.");
            return;
        }
        
        // 토큰 삭제
        context.RefreshTokens.RemoveRange(expiredTokens);
        await context.SaveChangesAsync(stoppingToken);
        
        _logger.LogInformation(
            "RefreshToken 정리 완료: {Count}개 토큰 삭제됨 (만료 또는 폐기)",
            expiredTokens.Count);
    }
}
