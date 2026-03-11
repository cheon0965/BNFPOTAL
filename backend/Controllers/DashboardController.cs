using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BnfErpPortal.Data;
using BnfErpPortal.DTOs;
using BnfErpPortal.Constants;

namespace BnfErpPortal.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : BaseController
{
    private readonly ApplicationDbContext _context;
    
    public DashboardController(ApplicationDbContext context)
    {
        _context = context;
    }
    
    [HttpGet("stats")]
    // GetStats 액션 - 로그인 사용자의 권한/회사 범위 내에서 요청 통계, 회사/사용자 수, SLA 지표 등을 집계하여 대시보드 정보를 반환합니다.
    public async Task<ActionResult<RequestStatsDto>> GetStats()
    {
        var query = _context.Requests.AsQueryable();
        
        if (!IsInternalUser())
        {
            var companyId = GetCurrentCompanyId();
            if (companyId.HasValue)
                query = query.Where(r => r.CompanyId == companyId.Value);
        }
        
        // 단일 GroupBy 쿼리로 모든 상태별 카운트를 한 번에 조회 (6번 DB 호출 → 1번)
        var statusCounts = await query
            .GroupBy(r => r.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();
        
        var stats = new RequestStatsDto
        {
            Total = statusCounts.Sum(x => x.Count),
            Submitted = statusCounts.FirstOrDefault(x => x.Status == "SUBMITTED")?.Count ?? 0,
            Assigned = statusCounts.FirstOrDefault(x => x.Status == "ASSIGNED")?.Count ?? 0,
            InProgress = statusCounts.FirstOrDefault(x => x.Status == "IN_PROGRESS")?.Count ?? 0,
            InterimReplied = statusCounts.FirstOrDefault(x => x.Status == "INTERIM_REPLIED")?.Count ?? 0,
            Completed = statusCounts.FirstOrDefault(x => x.Status == "COMPLETED")?.Count ?? 0
        };
        
        return Ok(stats);
    }
    
    [HttpGet("admin-stats")]
    [Authorize(Policy = AuthorizationPolicies.AdminOrManager)]
    // GetAdminStats 액션 - 데이터를 조회합니다.
    public async Task<ActionResult<DashboardStatsDto>> GetAdminStats()
    {
        // 단일 GroupBy 쿼리로 모든 상태별 카운트를 한 번에 조회 (6번 DB 호출 → 1번)
        var statusCounts = await _context.Requests
            .GroupBy(r => r.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();
        
        var total = statusCounts.Sum(x => x.Count);
        var submitted = statusCounts.FirstOrDefault(x => x.Status == "SUBMITTED")?.Count ?? 0;
        var assigned = statusCounts.FirstOrDefault(x => x.Status == "ASSIGNED")?.Count ?? 0;
        var inProgress = statusCounts.FirstOrDefault(x => x.Status == "IN_PROGRESS")?.Count ?? 0;
        var interimReplied = statusCounts.FirstOrDefault(x => x.Status == "INTERIM_REPLIED")?.Count ?? 0;
        var completed = statusCounts.FirstOrDefault(x => x.Status == "COMPLETED")?.Count ?? 0;
        
        // Calculate My Incomplete Tasks
        var currentUserId = GetCurrentUserId();
        var myIncompleteTasks = await _context.Requests
            .CountAsync(r => r.AssignedToUserId == currentUserId && r.Status != "COMPLETED");
        
        // Calculate Average Response Time (time from request creation to first comment)
        // For performance, only calculate from recent 100 requests that have comments
        var avgResponseTime = "N/A";
        try
        {
            var requestsWithFirstComment = await _context.Requests
                .Where(r => _context.RequestComments.Any(c => c.RequestId == r.RequestId))
                .OrderByDescending(r => r.CreatedAt)
                .Take(100)
                .Select(r => new 
                {
                    RequestCreatedAt = r.CreatedAt,
                    FirstCommentAt = _context.RequestComments
                        .Where(c => c.RequestId == r.RequestId)
                        .OrderBy(c => c.CreatedAt)
                        .Select(c => c.CreatedAt)
                        .FirstOrDefault()
                })
                .Where(x => x.FirstCommentAt != default)
                .ToListAsync();
            
            if (requestsWithFirstComment.Any())
            {
                var avgMinutes = requestsWithFirstComment
                    .Select(x => (x.FirstCommentAt - x.RequestCreatedAt).TotalMinutes)
                    .Average();
                
                if (avgMinutes < 60)
                {
                    avgResponseTime = $"{Math.Round(avgMinutes)}분";
                }
                else if (avgMinutes < 1440) // less than 24 hours
                {
                    avgResponseTime = $"{Math.Round(avgMinutes / 60, 1)}시간";
                }
                else
                {
                    avgResponseTime = $"{Math.Round(avgMinutes / 1440, 1)}일";
                }
            }
        }
        catch
        {
            // If calculation fails, keep default "N/A"
        }
        
        // 회사 및 사용자 카운트도 병렬로 조회
        var companiesCount = await _context.Companies.CountAsync(c => c.IsActive);
        var usersCount = await _context.Users.CountAsync(u => u.IsActive);
        
        // 최근 활동 로그 3개 조회
        var recentLogs = await _context.AuditLogs
            .Include(l => l.User)
            .OrderByDescending(l => l.CreatedAt)
            .Take(3)
            .Select(l => new RecentActivityDto
            {
                Type = l.Action,
                Message = $"{(l.User != null ? l.User.Name : "시스템")}님이 {l.Action} 작업을 수행했습니다.",
                Time = l.CreatedAt.ToString("MM.dd HH:mm")
            })
            .ToListAsync();
        
        var stats = new DashboardStatsDto
        {
            Requests = new RequestStatsDto
            {
                Total = total,
                Submitted = submitted,
                Assigned = assigned,
                InProgress = inProgress,
                InterimReplied = interimReplied,
                Completed = completed
            },
            TotalCompanies = companiesCount,
            TotalUsers = usersCount,
            MyIncompleteTasks = myIncompleteTasks,
            AvgResponseTime = avgResponseTime,
            RecentActivities = recentLogs
        };
        
        return Ok(stats);
    }
}