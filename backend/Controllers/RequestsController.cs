// ============================================================================
// 파일명: RequestsController.cs
// 경로: Backend/Controllers/RequestsController.cs
// 설명: 유지보수 요청 API 컨트롤러 - 핵심 비즈니스 로직
// ----------------------------------------------------------------------------
// [API 엔드포인트]
//   GET    /api/requests              - 요청 목록 조회 (페이징, 필터링)
//   GET    /api/requests/{id}         - 요청 상세 조회
//   POST   /api/requests              - 요청 생성
//   PUT    /api/requests/{id}         - 요청 수정
//   DELETE /api/requests/{id}         - 요청 삭제 (SUBMITTED 상태만)
//   PATCH  /api/requests/{id}/status  - 상태 변경
//   PATCH  /api/requests/{id}/assignee - 담당자 배정 (내부 사용자 전용)
//   GET    /api/requests/stats        - 통계 조회
//   GET    /api/requests/{id}/comments - 댓글 목록 조회
//   POST   /api/requests/{id}/comments - 댓글 작성 (상태 자동 변경)
//
// [권한 규칙]
//   - 고객: 자사 요청만 조회/생성/수정 가능
//   - 내부 사용자: 모든 요청 조회, 담당자 배정, 상태 변경 가능
//
// [상태 워크플로우]
//   SUBMITTED → ASSIGNED → IN_PROGRESS → INTERIM_REPLIED → COMPLETED
//
// [유지보수 가이드]
//   - 상태 변경 시 이메일 알림 발송 (EmailService)
//   - 내부 사용자 외부 댓글 작성 시 INTERIM_REPLIED로 자동 전환
//   - CRITICAL 우선순위 요청 시 내부 전체 알림
// ============================================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using BnfErpPortal.Constants;
using BnfErpPortal.Data;
using BnfErpPortal.DTOs;
using BnfErpPortal.Models;
using BnfErpPortal.Services;
using ClosedXML.Excel;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.SignalR;
using BnfErpPortal.Hubs;

namespace BnfErpPortal.Controllers;

/// <summary>
/// 유지보수 요청 관리 API 컨트롤러
/// </summary>
/// <remarks>
/// <para>ERP 포털의 핵심 기능 - 요청 CRUD, 상태 관리, 댓글, 알림</para>
/// <para>모든 엔드포인트는 인증 필요 ([Authorize])</para>
/// </remarks>
[Route("api/[controller]")]
[Authorize]
public class RequestsController : BaseController
{
    private static readonly Regex HtmlTagRegex = new Regex("<.*?>", RegexOptions.Compiled);

    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IEmailTemplateService _emailTemplateService;
    private readonly IAuditLogService _auditLogService;
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ILogger<RequestsController> _logger;
    private readonly IWebHostEnvironment _environment;
    private readonly IConfiguration _configuration;

    public RequestsController(
        ApplicationDbContext context,
        IEmailService emailService,
        IEmailTemplateService emailTemplateService,
        IAuditLogService auditLogService,
        IHubContext<NotificationHub> hubContext,
        ILogger<RequestsController> logger,
        IWebHostEnvironment environment,
        IConfiguration configuration)
    {
        _context = context;
        _emailService = emailService;
        _emailTemplateService = emailTemplateService;
        _auditLogService = auditLogService;
        _hubContext = hubContext;
        _logger = logger;
        _environment = environment;
        _configuration = configuration;
    }

    #region 요청 목록/상세 조회

    /// <summary>
    /// 요청 목록 조회 (페이징, 필터링 지원)
    /// </summary>
    /// <param name="status">상태 필터 (SUBMITTED, ASSIGNED 등)</param>
    /// <param name="priority">우선순위 필터</param>
    /// <param name="search">제목/내용 검색어</param>
    /// <param name="companyId">회사 필터 (내부 사용자 전용)</param>
    /// <param name="page">페이지 번호 (1부터 시작)</param>
    /// <param name="pageSize">페이지 크기</param>
    /// <returns>페이징된 요청 목록</returns>
    /// <remarks>고객은 자사 요청만 조회, 내부 사용자는 전체 조회 가능</remarks>
    [HttpGet]
    public async Task<ActionResult<PagedResult<RequestDto>>> GetRequests(
        [FromQuery] string? status,
        [FromQuery] string? priority,
        [FromQuery] string? search,
        [FromQuery] int? companyId,
        [FromQuery] string? category,
        [FromQuery] int? createdByUserId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _context.Requests
            .AsNoTracking()
            .Include(r => r.Company)
            .Include(r => r.CreatedBy)
            .Include(r => r.AssignedTo)
            .Include(r => r.Comments)
            .AsQueryable();

        // 회사 범위 제한 (고객은 자사 데이터만)
        if (!IsInternalUser())
        {
            var currentCompanyId = GetCurrentCompanyId();
            if (currentCompanyId.HasValue)
            {
                query = query.Where(r => r.CompanyId == currentCompanyId.Value);
            }
        }
        else
        {
            // 내부 사용자: 회사 필터 선택적 적용
            if (companyId.HasValue)
            {
                query = query.Where(r => r.CompanyId == companyId.Value);
            }
        }

        // Apply filters
        if (!string.IsNullOrEmpty(status))
            query = query.Where(r => r.Status == status);

        if (!string.IsNullOrEmpty(priority))
            query = query.Where(r => r.Priority == priority);

        if (!string.IsNullOrEmpty(category))
            query = query.Where(r => r.Category == category);

        if (createdByUserId.HasValue)
            query = query.Where(r => r.CreatedByUserId == createdByUserId.Value);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(r => r.Title.Contains(search) || r.Content.Contains(search));

        // Get total count before pagination
        var totalCount = await query.CountAsync();

        var requests = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new RequestDto
            {
                RequestId = r.RequestId,
                CompanyId = r.CompanyId,
                CompanyName = r.Company.Name,
                CompanyPhoneNumber = r.Company.PhoneNumber,
                ErpSystemId = r.ErpSystemId,
                Title = r.Title,
                Content = r.Content,
                Category = r.Category,
                Priority = r.Priority,
                Status = r.Status,
                CreatedBy = new UserDto
                {
                    UserId = r.CreatedBy.UserId,
                    Email = r.CreatedBy.Email,
                    Name = r.CreatedBy.Name,
                    PhoneNumber = r.CreatedBy.PhoneNumber,
                    Role = r.CreatedBy.Role
                },
                AssignedTo = r.AssignedTo != null ? new UserDto
                {
                    UserId = r.AssignedTo.UserId,
                    Email = r.AssignedTo.Email,
                    Name = r.AssignedTo.Name,
                    PhoneNumber = r.AssignedTo.PhoneNumber,
                    Role = r.AssignedTo.Role
                } : null,
                DueDate = r.DueDate,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt,
                ClosedAt = r.ClosedAt,
                CommentsCount = r.Comments.Count
            })
            .ToListAsync();

        return Ok(new PagedResult<RequestDto>
        {
            Items = requests,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }

    /// <summary>
    /// 요청 목록 엑셀 다운로드 (목록과 동일한 필터 적용)
    /// </summary>
    [HttpGet("export")]
    public async Task<IActionResult> ExportRequestsToExcel(
        [FromQuery] string? status,
        [FromQuery] string? priority,
        [FromQuery] string? search,
        [FromQuery] int? companyId,
        [FromQuery] string? category,
        [FromQuery] int? createdByUserId)
    {
        var query = _context.Requests
            .AsNoTracking()
            .Include(r => r.Company)
            .Include(r => r.CreatedBy)
            .Include(r => r.AssignedTo)
            .Include(r => r.Comments)
            .AsQueryable();

        // 회사 범위 제한 (고객은 자사 데이터만)
        if (!IsInternalUser())
        {
            var currentCompanyId = GetCurrentCompanyId();
            if (currentCompanyId.HasValue)
            {
                query = query.Where(r => r.CompanyId == currentCompanyId.Value);
            }
        }
        else
        {
            // 내부 사용자: 회사 필터 선택적 적용
            if (companyId.HasValue)
            {
                query = query.Where(r => r.CompanyId == companyId.Value);
            }
        }

        // Apply filters
        if (!string.IsNullOrEmpty(status))
            query = query.Where(r => r.Status == status);

        if (!string.IsNullOrEmpty(priority))
            query = query.Where(r => r.Priority == priority);

        if (!string.IsNullOrEmpty(category))
            query = query.Where(r => r.Category == category);

        if (createdByUserId.HasValue)
            query = query.Where(r => r.CreatedByUserId == createdByUserId.Value);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(r => r.Title.Contains(search) || r.Content.Contains(search) || r.Company.Name.Contains(search));

        var requests = await query
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new {
                RequestId = r.RequestId,
                Category = r.Category,
                Priority = r.Priority,
                Status = r.Status,
                Title = r.Title,
                Content = r.Content ?? "",
                CompanyName = r.Company != null ? r.Company.Name : "",
                CreatedByName = r.CreatedBy != null ? r.CreatedBy.Name : "",
                AssignedToName = r.AssignedTo != null ? r.AssignedTo.Name : "",
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt,
                ClosedAt = r.ClosedAt,
                // 가장 최근 내부 답변 추출 (비앤에프소프트 직원이 쓴 IsInternal == false 인 댓글 중 가장 최신)
                LatestBnfAnswer = r.Comments.Where(c => !c.IsInternal).OrderByDescending(c => c.CreatedAt).Select(c => c.Content).FirstOrDefault() ?? ""
            })
            .Take(1000)
            .ToListAsync();

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("요청 목록");

        // 상단 제목 (유지보수 요청) 명시
        worksheet.Range("A1:M1").Merge().Value = "유지보수 요청";
        worksheet.Cell("A1").Style.Font.Bold = true;
        worksheet.Cell("A1").Style.Font.FontSize = 20;
        worksheet.Cell("A1").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        worksheet.Cell("A1").Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        worksheet.Row(1).Height = 40;

        // 헤더 설정 (2행으로 이동)
        var headers = new[] { "번호", "요청분류", "우선순위", "처리상태", "요청제목", "요청내용", "BNF_최신답변", "회사명", "작성자", "담당자", "등록일", "최근업데이트일", "완료일" };
        for (int i = 0; i < headers.Length; i++)
        {
            worksheet.Cell(2, i + 1).Value = headers[i];
            worksheet.Cell(2, i + 1).Style.Font.Bold = true;
            worksheet.Cell(2, i + 1).Style.Fill.BackgroundColor = XLColor.LightGray;
            worksheet.Cell(2, i + 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            worksheet.Cell(2, i + 1).Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        }

        // AutoFilter 활성화
        worksheet.Range(2, 1, 2, headers.Length).SetAutoFilter();

        // 상태 레이블 매핑
        var statusLabels = new Dictionary<string, string>
        {
            { "SUBMITTED", "전달" },
            { "ASSIGNED", "담당자 배정" },
            { "IN_PROGRESS", "처리중" },
            { "INTERIM_REPLIED", "중간답변완료" },
            { "COMPLETED", "완료" }
        };

        var priorityLabels = new Dictionary<string, string>
        {
            { "CRITICAL", "긴급" },
            { "HIGH", "높음" },
            { "MEDIUM", "보통" },
            { "LOW", "낮음" }
        };

        var categoryLabels = new Dictionary<string, string>
        {
            { "BUG", "버그" },
            { "QUESTION", "문의" },
            { "IMPROVEMENT", "개선" }
        };

        int row = 3;
        foreach (var r in requests)
        {
            // HTML 태그 제거 및 디코딩 (컴파일된 정규식 사용)
            var plainContent = HtmlTagRegex.Replace(r.Content, String.Empty);
            plainContent = System.Net.WebUtility.HtmlDecode(plainContent);

            var plainAnswer = HtmlTagRegex.Replace(r.LatestBnfAnswer, String.Empty);
            plainAnswer = System.Net.WebUtility.HtmlDecode(plainAnswer);

            worksheet.Cell(row, 1).Value = r.RequestId;
            worksheet.Cell(row, 2).Value = categoryLabels.ContainsKey(r.Category) ? categoryLabels[r.Category] : r.Category;
            worksheet.Cell(row, 3).Value = priorityLabels.ContainsKey(r.Priority) ? priorityLabels[r.Priority] : r.Priority;
            worksheet.Cell(row, 4).Value = statusLabels.ContainsKey(r.Status) ? statusLabels[r.Status] : r.Status;
            worksheet.Cell(row, 5).Value = r.Title;
            worksheet.Cell(row, 6).Value = plainContent;
            worksheet.Cell(row, 7).Value = plainAnswer;
            worksheet.Cell(row, 8).Value = r.CompanyName;
            worksheet.Cell(row, 9).Value = r.CreatedByName;
            worksheet.Cell(row, 10).Value = r.AssignedToName;
            worksheet.Cell(row, 11).Value = r.CreatedAt.ToString("yyyy-MM-dd HH:mm");
            worksheet.Cell(row, 12).Value = r.UpdatedAt.ToString("yyyy-MM-dd HH:mm");
            worksheet.Cell(row, 13).Value = r.ClosedAt?.ToString("yyyy-MM-dd HH:mm");

            // 줄바꿈 활성화 및 상단 정렬
            worksheet.Range(row, 1, row, headers.Length).Style.Alignment.WrapText = true;
            worksheet.Range(row, 1, row, headers.Length).Style.Alignment.Vertical = XLAlignmentVerticalValues.Top;

            row++;
        }

        // 1. 전체 컬럼 너비를 데이터에 맞게 자동 조절
        worksheet.Columns().AdjustToContents();

        // 2. 글자 잘림 방지를 위해 자동 조절된 너비에 여백(약 1.3배) 및 최소 너비 보장 부여
        foreach (var col in worksheet.ColumnsUsed())
        {
            var calculatedWidth = (col.Width * 1.3) + 4; // 필터 화살표 아이콘 영역 확보 (+4)
            col.Width = calculatedWidth < 14 ? 14 : calculatedWidth; // 모든 열 최소 너비 14 보장
        }
        
        // 특정 열 너비 미세조정 (요청제목, 내용, 답변 등)
        if (worksheet.Column(5).Width < 30) worksheet.Column(5).Width = 30; // 제목
        
        if (worksheet.Column(6).Width > 100) worksheet.Column(6).Width = 100; // 내용 너비 상한
        else if (worksheet.Column(6).Width < 50) worksheet.Column(6).Width = 50;

        if (worksheet.Column(7).Width > 100) worksheet.Column(7).Width = 100; // 답변 너비 상한
        else if (worksheet.Column(7).Width < 50) worksheet.Column(7).Width = 50;

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        var content = stream.ToArray();

        string fileName = $"requests_export_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";
        return File(content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }
    
    [HttpGet("{id}")]
    // GetRequest 액션 - 단일 요청의 상세 정보와 회사/사용자/코멘트/첨부파일 정보를 함께 조회합니다.
    public async Task<ActionResult<RequestDto>> GetRequest(int id)
    {
        var request = await _context.Requests
            .AsNoTracking()
            .Include(r => r.Company)
            .Include(r => r.ErpSystem)
            .Include(r => r.CreatedBy)
            .Include(r => r.AssignedTo)
            .Include(r => r.Comments)
            .Include(r => r.Attachments)
            .FirstOrDefaultAsync(r => r.RequestId == id);
        
        if (request == null)
            return NotFound();
        
        // Check access
        if (!IsInternalUser() && request.CompanyId != GetCurrentCompanyId())
            return Forbid();
        
        return Ok(new RequestDto
        {
            RequestId = request.RequestId,
            CompanyId = request.CompanyId,
            CompanyName = request.Company.Name,
            CompanyPhoneNumber = request.Company.PhoneNumber,
            ErpSystemId = request.ErpSystemId,
            ErpSystemName = request.ErpSystem?.Name,
            ErpSystemVersion = request.ErpSystem?.Version,
            Title = request.Title,
            Content = request.Content,
            Category = request.Category,
            Priority = request.Priority,
            Status = request.Status,
            CreatedBy = new UserDto
            {
                UserId = request.CreatedBy.UserId,
                Email = request.CreatedBy.Email,
                Name = request.CreatedBy.Name,
                PhoneNumber = request.CreatedBy.PhoneNumber,
                Role = request.CreatedBy.Role
            },
            AssignedTo = request.AssignedTo != null ? new UserDto
            {
                UserId = request.AssignedTo.UserId,
                Email = request.AssignedTo.Email,
                Name = request.AssignedTo.Name,
                PhoneNumber = request.AssignedTo.PhoneNumber,
                Role = request.AssignedTo.Role
            } : null,
            DueDate = request.DueDate,
            CreatedAt = request.CreatedAt,
            UpdatedAt = request.UpdatedAt,
            ClosedAt = request.ClosedAt,
            CommentsCount = request.Comments.Count,
            Attachments = request.Attachments
                .Where(a => a.CommentId == null)  // Only request-level attachments
                .Select(a => new AttachmentDto
                {
                    AttachmentId = a.AttachmentId,
                    FileName = a.FileName,
                    FileSize = a.FileSize,
                    ContentType = a.ContentType,
                    CreatedAt = a.CreatedAt
                }).ToList()
        });
    }
    
    [HttpPost]
    // CreateRequest 액션 - 고객 또는 내부 사용자가 새로운 유지보수 요청을 등록하고, 관련 알림/이메일을 생성합니다.
    public async Task<ActionResult<RequestDto>> CreateRequest([FromBody] CreateRequestRequest requestData)
    {
        var userId = GetCurrentUserId();
        var companyId = GetCurrentCompanyId();
        
        if (!companyId.HasValue)
            return BadRequest(new { message = "회사 정보가 없습니다." });
        
        var request = new Request
        {
            CompanyId = companyId.Value,
            ErpSystemId = requestData.ErpSystemId,
            Title = requestData.Title,
            Content = requestData.Content,
            Category = requestData.Category,
            Priority = requestData.Priority,
            Status = "SUBMITTED",
            CreatedByUserId = userId,
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now
        };
        
        _context.Requests.Add(request);
        await _context.SaveChangesAsync();
        // 요청 생성 알림 수신 대상(내부 사용자) 일원화: DB 알림/SignalR 모두 동일 대상을 사용
        var internalUsers = await _context.Users
            .Where(u => u.CompanyId == BnfCompany.CompanyId && u.IsActive)
            .Select(u => u.UserId)
            .ToListAsync();

        if (internalUsers.Count > 0)
        {
            var isCritical = request.Priority == BnfErpPortal.Constants.RequestPriority.Critical;
            var message = isCritical
                ? $"[긴급 요청] '{request.Title}' 요청이 등록되었습니다."
                : $"[새 요청] '{request.Title}' 요청이 등록되었습니다.";
            var type = isCritical ? "URGENT_REQUEST" : "NEW_REQUEST";
            var now = DateTime.Now;

            var notifications = internalUsers.Select(userIdBnF => new Notification
            {
                UserId = userIdBnF,
                RequestId = request.RequestId,
                Message = message,
                Type = type,
                IsRead = false,
                CreatedAt = now
            }).ToList();

            _context.Notifications.AddRange(notifications);
            await _context.SaveChangesAsync();
        }

        await _auditLogService.LogActionAsync(userId, "REQUEST", request.RequestId, "CREATE", null, $"Status: {request.Status}");

        // --- SignalR 실시간 알림: 새 요청 등록 (DB 알림 수신자와 동일 대상만) ---
        if (internalUsers.Count > 0)
        {
            try
            {
                var targetGroups = internalUsers.Select(uid => $"User_{uid}").ToList();
                await _hubContext.Clients.Groups(targetGroups).SendAsync("ReceiveNotification", new
                {
                    Type = "NewRequest",
                    RequestId = request.RequestId,
                    Title = request.Title,
                    Priority = request.Priority,
                    CreatedAt = request.CreatedAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SignalR 알림 전송 실패: NewRequest");
            }
        }
        
        return CreatedAtAction(nameof(GetRequest), new { id = request.RequestId }, request);
    }
    
    
    [HttpPatch("{id}/status")]
    // UpdateStatus 액션 - 요청의 상태를 변경하고, 필요한 경우 요청 등록자에게 알림과 상태 변경 메일을 발송합니다.
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateRequestStatusRequest requestData)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null)
            return NotFound();

        // Check access
        if (!IsInternalUser() && request.CompanyId != GetCurrentCompanyId())
            return Forbid();

        var oldStatus = request.Status;
        var requestLink = $"{Request.Scheme}://{Request.Host}/requests/{request.RequestId}";
        var shouldNotifyCreator = request.CreatedByUserId != GetCurrentUserId();

        request.Status = requestData.Status;
        request.UpdatedAt = DateTime.Now;

        if (requestData.Status == "COMPLETED")
            request.ClosedAt = DateTime.Now;

        // Create DB notification when actor and recipient are different users.
        if (shouldNotifyCreator)
        {
            var statusLabels = new Dictionary<string, string>
            {
                { "SUBMITTED", "접수" },
                { "ASSIGNED", "담당자 배정" },
                { "IN_PROGRESS", "처리중" },
                { "INTERIM_REPLIED", "중간답변완료" },
                { "COMPLETED", "완료" }
            };

            var oldStatusLabel = statusLabels.ContainsKey(oldStatus) ? statusLabels[oldStatus] : oldStatus;
            var newStatusLabel = statusLabels.ContainsKey(request.Status) ? statusLabels[request.Status] : request.Status;

            var notification = new Notification
            {
                UserId = request.CreatedByUserId,
                RequestId = request.RequestId,
                Message = $"요청 '{request.Title}'의 상태가 '{newStatusLabel}'(으)로 변경되었습니다.",
                Type = "STATUS_CHANGE",
                CreatedAt = DateTime.Now
            };

            _context.Notifications.Add(notification);

            var targetUser = await _context.Users.FindAsync(request.CreatedByUserId);
            if (targetUser != null && !string.IsNullOrEmpty(targetUser.Email))
            {
                // Keep current policy: send status emails only for interim/completed.
                if (request.Status == "INTERIM_REPLIED" || request.Status == "COMPLETED")
                {
                    var data = new Dictionary<string, string>
                    {
                        ["UserName"] = targetUser.Name,
                        ["RequestTitle"] = request.Title,
                        ["OldStatus"] = oldStatusLabel,
                        ["NewStatus"] = newStatusLabel,
                        ["Reason"] = "요청 상태가 변경되었습니다.",
                        ["RequestLink"] = requestLink
                    };

                    var (subject, body) = await _emailTemplateService.RenderAsync("REQUEST_STATUS_CHANGED", data);
                    if (!string.IsNullOrWhiteSpace(subject) && !string.IsNullOrWhiteSpace(body))
                    {
                        await _emailService.SendAsync(targetUser.Email, subject, body);
                    }
                }
            }
        }

        await _context.SaveChangesAsync();
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "REQUEST", request.RequestId, "STATUS_CHANGE", oldStatus, request.Status);

        // Send realtime notification to the exact same recipient as DB notification.
        if (shouldNotifyCreator)
        {
            try
            {
                await _hubContext.Clients.Group($"User_{request.CreatedByUserId}").SendAsync("ReceiveNotification", new
                {
                    Type = "StatusChanged",
                    RequestId = request.RequestId,
                    Title = request.Title,
                    Status = request.Status,
                    UpdatedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SignalR notification send failed: StatusChanged");
            }
        }

        return NoContent();
    }

    [HttpPatch("{id}/assignee")]
    [Authorize(Policy = AuthorizationPolicies.InternalStaff)]
    // UpdateAssignee 액션 - 요청의 담당 엔지니어를 배정 또는 변경하고, 배정 결과를 알림으로 남깁니다.
    public async Task<IActionResult> UpdateAssignee(int id, [FromBody] UpdateRequestAssigneeRequest requestData)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null)
            return NotFound();
        
        request.AssignedToUserId = requestData.UserId;
        request.UpdatedAt = DateTime.Now;
        
        // 담당자가 배정되면 SUBMITTED → ASSIGNED로 상태 변경
        if (request.Status == "SUBMITTED" && requestData.UserId.HasValue)
            request.Status = "ASSIGNED";
        
        await _context.SaveChangesAsync();

        // --- DB 알림(종 아이콘): 담당자 배정 ---
        if (requestData.UserId.HasValue)
        {
            var notification = new Notification
            {
                UserId = requestData.UserId.Value,
                RequestId = request.RequestId,
                Message = $"요청 '{request.Title}'의 담당자로 배정되었습니다.",
                Type = "ASSIGNEE_CHANGE",
                IsRead = false,
                CreatedAt = DateTime.Now
            };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();
        }

        await _auditLogService.LogActionAsync(GetCurrentUserId(), "REQUEST", request.RequestId, "ASSIGN", null, $"AssignedTo: {requestData.UserId}");

        // --- SignalR 실시간 알림: 담당자 배정 ---
        if (requestData.UserId.HasValue)
        {
            try
            {
                await _hubContext.Clients.Group($"User_{requestData.UserId}").SendAsync("ReceiveNotification", new
                {
                    Type = "AssignedToYou",
                    RequestId = request.RequestId,
                    Title = request.Title,
                    AssignedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SignalR 알림 전송 실패: AssignedToYou");
            }

            // --- 이메일 발송: 담당자 배정 ---
            var targetUser = await _context.Users.FindAsync(requestData.UserId.Value);
            if (targetUser != null && !string.IsNullOrEmpty(targetUser.Email))
            {
                var requestLink = $"{Request.Scheme}://{Request.Host}/requests/{request.RequestId}";
                var data = new Dictionary<string, string>
                {
                    ["UserName"] = targetUser.Name,
                    ["RequestTitle"] = request.Title,
                    ["RequestLink"] = requestLink
                };

                var (subject, body) = await _emailTemplateService.RenderAsync("REQUEST_ASSIGNED", data);
                if (!string.IsNullOrWhiteSpace(subject) && !string.IsNullOrWhiteSpace(body))
                {
                    await _emailService.SendAsync(targetUser.Email, subject, body);
                }
            }
        }
        
        return NoContent();
    }
    
    [HttpGet("{requestId}/comments")]
    // GetComments 액션 - 특정 요청에 달린 댓글 목록과 작성자/첨부파일 정보를 조회합니다.
    public async Task<ActionResult<List<RequestCommentDto>>> GetComments(int requestId)
    {
        var request = await _context.Requests.FindAsync(requestId);
        if (request == null)
            return NotFound();
        
        // Check access
        if (!IsInternalUser() && request.CompanyId != GetCurrentCompanyId())
            return Forbid();
        
        var query = _context.RequestComments
            .AsNoTracking()
            .Include(c => c.User)
            .Include(c => c.Attachments)
            .Where(c => c.RequestId == requestId);
        
        // Hide internal comments from customers
        if (!IsInternalUser())
            query = query.Where(c => !c.IsInternal);
        
        var comments = await query
            .OrderBy(c => c.CreatedAt)
            .Select(c => new RequestCommentDto
            {
                CommentId = c.CommentId,
                RequestId = c.RequestId,
                User = new UserDto
                {
                    UserId = c.User.UserId,
                    Email = c.User.Email,
                    Name = c.User.Name,
                    Role = c.User.Role,
                    PhoneNumber = c.User.PhoneNumber
                },
                Content = c.Content,
                IsInternal = c.IsInternal,
                CreatedAt = c.CreatedAt,
                Attachments = c.Attachments.Select(a => new AttachmentDto
                {
                    AttachmentId = a.AttachmentId,
                    CommentId = a.CommentId,
                    FileName = a.FileName,
                    FileSize = a.FileSize,
                    ContentType = a.ContentType,
                    CreatedAt = a.CreatedAt
                }).ToList()
            })
            .ToListAsync();
        
        return Ok(comments);
    }
    
    [HttpPost("{requestId}/comments")]
    // CreateComment 액션 - 요청에 대한 새 댓글을 등록하고, 내부/외부 댓글 여부에 따라 알림과 이메일을 전송합니다.
    public async Task<ActionResult<RequestCommentDto>> CreateComment(int requestId, [FromBody] CreateCommentRequest commentRequest)
    {
        var request = await _context.Requests.FindAsync(requestId);
        if (request == null)
            return NotFound();
        
        // Check access
        if (!IsInternalUser() && request.CompanyId != GetCurrentCompanyId())
            return Forbid();
        
        // Only internal users can create internal comments
        if (commentRequest.IsInternal && !IsInternalUser())
            return Forbid();
        
        var requestLink = $"{Request.Scheme}://{Request.Host}/requests/{request.RequestId}";
        
        var comment = new RequestComment
        {
            RequestId = requestId,
            UserId = GetCurrentUserId(),
            Content = commentRequest.Content,
            IsInternal = commentRequest.IsInternal,
            CreatedAt = DateTime.Now
        };
        
        _context.RequestComments.Add(comment);
        var realtimeNewCommentRecipientIds = new HashSet<int>();
        var realtimeStatusChangeRecipientIds = new HashSet<int>();
        
        // Update request
        request.UpdatedAt = DateTime.Now;
        
        // 비엔에프소프트 직원(내부 사용자)이 외부 댓글(고객에게 보이는 댓글)을 달면 
        // 1. 담당자가 없으면 현재 사용자를 담당자로 지정
        // 2. 상태를 중간답변완료(INTERIM_REPLIED)로 변경 (완료된 요청 제외)
        if (IsInternalUser() && !commentRequest.IsInternal)
        {
            if (request.AssignedToUserId == null)
            {
                request.AssignedToUserId = GetCurrentUserId();
            }

            if (request.Status != "COMPLETED")
            {
                request.Status = "INTERIM_REPLIED";
                
                // Create notification for status change
                if (request.CreatedByUserId != GetCurrentUserId())
                {
                    var notification = new Notification
                    {
                        UserId = request.CreatedByUserId,
                        RequestId = request.RequestId,
                        Message = $"요청 '{request.Title}'의 상태가 '중간답변완료'(으)로 변경되었습니다.",
                        Type = "STATUS_CHANGE",
                        CreatedAt = DateTime.Now
                    };
                    _context.Notifications.Add(notification);
                    realtimeStatusChangeRecipientIds.Add(request.CreatedByUserId);

                    var targetUser = await _context.Users.FindAsync(request.CreatedByUserId);
                    if (targetUser != null && !string.IsNullOrEmpty(targetUser.Email))
                    {
                        var data = new Dictionary<string, string>
                        {
                            ["UserName"] = targetUser.Name,
                            ["RequestTitle"] = request.Title,
                            ["OldStatus"] = string.Empty,
                            ["NewStatus"] = "중간답변완료",
                            ["Reason"] = $"중간답변이 등록되었습니다. 내용: {comment.Content}",
                            ["RequestLink"] = requestLink
                        };

                        var (subject, body) = await _emailTemplateService.RenderAsync("REQUEST_STATUS_CHANGED", data);
                        if (!string.IsNullOrWhiteSpace(subject) && !string.IsNullOrWhiteSpace(body))
                        {
                            await _emailService.SendAsync(targetUser.Email, subject, body);
                        }
                    }
                }
            }
        }
        // 고객이 댓글을 달면 → 담당자(또는 내부 전체)에게 DB 알림 생성
        else if (!IsInternalUser())
        {
            if (request.AssignedToUserId.HasValue)
            {
                var notification = new Notification
                {
                    UserId = request.AssignedToUserId.Value,
                    RequestId = request.RequestId,
                    Message = $"요청 '{request.Title}'에 고객이 새 댓글을 등록했습니다.",
                    Type = "NEW_COMMENT",
                    IsRead = false,
                    CreatedAt = DateTime.Now
                };
                _context.Notifications.Add(notification);
                realtimeNewCommentRecipientIds.Add(request.AssignedToUserId.Value);
            }
            else
            {
                // 담당자 미배정 시 내부 사용자 전원에게 알림
                var internalUsers = await _context.Users
                    .Where(u => u.CompanyId == BnfCompany.CompanyId && u.IsActive)
                    .Select(u => u.UserId)
                    .ToListAsync();

                var notifications = internalUsers.Select(uid => new Notification
                {
                    UserId = uid,
                    RequestId = request.RequestId,
                    Message = $"요청 '{request.Title}'에 고객이 새 댓글을 등록했습니다.",
                    Type = "NEW_COMMENT",
                    IsRead = false,
                    CreatedAt = DateTime.Now
                }).ToList();

                _context.Notifications.AddRange(notifications);
                realtimeNewCommentRecipientIds.UnionWith(internalUsers);
            }
        }
        
        await _context.SaveChangesAsync();
        
        // Reload comment with user info
        var createdComment = await _context.RequestComments
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.CommentId == comment.CommentId);
        
        var result = new RequestCommentDto
        {
            CommentId = createdComment!.CommentId,
            RequestId = createdComment.RequestId,
            User = new UserDto
            {
                UserId = createdComment.User.UserId,
                Email = createdComment.User.Email,
                Name = createdComment.User.Name,
                PhoneNumber = createdComment.User.PhoneNumber,
                Role = createdComment.User.Role
            },
            Content = createdComment.Content,
            IsInternal = createdComment.IsInternal,
            CreatedAt = createdComment.CreatedAt
        };
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "COMMENT", comment.CommentId, "CREATE", null, $"RequestId: {requestId}");

        try
        {
            if (realtimeStatusChangeRecipientIds.Count > 0)
            {
                var statusTargetGroups = realtimeStatusChangeRecipientIds
                    .Select(uid => $"User_{uid}")
                    .ToList();

                await _hubContext.Clients.Groups(statusTargetGroups).SendAsync("ReceiveNotification", new
                {
                    Type = "StatusChanged",
                    RequestId = request.RequestId,
                    Title = request.Title,
                    Status = request.Status,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            if (realtimeNewCommentRecipientIds.Count > 0)
            {
                var commentTargetGroups = realtimeNewCommentRecipientIds
                    .Select(uid => $"User_{uid}")
                    .ToList();

                await _hubContext.Clients.Groups(commentTargetGroups).SendAsync("ReceiveNotification", new
                {
                    Type = "NewComment",
                    RequestId = request.RequestId,
                    Title = request.Title,
                    IsInternal = comment.IsInternal,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SignalR notification send failed: CreateComment");
        }

        int? targetUserIdForEmail = null;

        if (IsInternalUser() && !commentRequest.IsInternal)
        {
            // 작성자가 내부직원이고 외부댓글 -> 고객에게 발송
            targetUserIdForEmail = request.CreatedByUserId;
        }
        else if (!IsInternalUser() && request.AssignedToUserId.HasValue)
        {
            // 작성자가 고객 -> 담당자에게 발송
            targetUserIdForEmail = request.AssignedToUserId.Value;
        }

        if (targetUserIdForEmail.HasValue && targetUserIdForEmail.Value != GetCurrentUserId())
        {
            var targetUser = await _context.Users.FindAsync(targetUserIdForEmail.Value);
            if (targetUser != null && !string.IsNullOrEmpty(targetUser.Email))
            {
                var data = new Dictionary<string, string>
                {
                    ["UserName"] = targetUser.Name,
                    ["RequestTitle"] = request.Title,
                    ["Reason"] = comment.Content,
                    ["RequestLink"] = requestLink
                };

                var (subject, body) = await _emailTemplateService.RenderAsync("NEW_COMMENT_RECEIVED", data);
                if (!string.IsNullOrWhiteSpace(subject) && !string.IsNullOrWhiteSpace(body))
                {
                    await _emailService.SendAsync(targetUser.Email, subject, body);
                }
            }
        }
        
        return Created("", result);
    }
    
    // Update comment (only creator can update)
    [HttpPut("{requestId}/comments/{commentId}")]
    // UpdateComment 액션 - 기존 댓글 내용을 수정할 수 있도록 합니다.
    public async Task<IActionResult> UpdateComment(int requestId, int commentId, [FromBody] UpdateCommentRequest data)
    {
        var comment = await _context.RequestComments
            .Include(c => c.Request)
            .FirstOrDefaultAsync(c => c.CommentId == commentId && c.RequestId == requestId);
        
        if (comment == null)
            return NotFound();
        
        // Only creator can update
        if (comment.UserId != GetCurrentUserId() && !IsInternalUser())
            return Forbid();

        // Only the last reply of the request can be edited
        var commentsQuery = _context.RequestComments
            .Where(c => c.RequestId == requestId);

        if (!IsInternalUser())
        {
            // Customers can only see non-internal comments, so "last reply" is based on visible comments
            if (comment.IsInternal)
                return Forbid();

            commentsQuery = commentsQuery.Where(c => !c.IsInternal);
        }

        var lastComment = await commentsQuery
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync();

        if (lastComment == null || lastComment.CommentId != commentId)
        {
            return BadRequest(new { message = "해당 요청의 가장 마지막 답변만 수정할 수 있습니다." });
        }

        comment.Content = data.Content;
        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "COMMENT", comment.CommentId, "UPDATE", null, $"RequestId: {requestId}");

        return NoContent();
    }
    
    // Delete comment (only creator can delete)
    [HttpDelete("{requestId}/comments/{commentId}")]
    // DeleteComment 액션 - 권한을 확인한 뒤 요청의 댓글을 삭제합니다.
    public async Task<IActionResult> DeleteComment(int requestId, int commentId)
    {
        var comment = await _context.RequestComments
            .Include(c => c.Attachments)
            .FirstOrDefaultAsync(c => c.CommentId == commentId && c.RequestId == requestId);
        
        if (comment == null)
            return NotFound();
        
        // Only creator or internal users can delete
        if (comment.UserId != GetCurrentUserId() && !IsInternalUser())
            return Forbid();

        // Only the last reply of the request can be deleted
        var commentsQuery = _context.RequestComments
            .Where(c => c.RequestId == requestId);

        if (!IsInternalUser())
        {
            // Customers can only see non-internal comments, so "last reply" is based on visible comments
            if (comment.IsInternal)
                return Forbid();

            commentsQuery = commentsQuery.Where(c => !c.IsInternal);
        }

        var lastComment = await commentsQuery
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync();

        if (lastComment == null || lastComment.CommentId != commentId)
        {
            return BadRequest(new { message = "해당 요청의 가장 마지막 답변만 삭제할 수 있습니다." });
        }

        // --- 1. 본문에 포함된 인라인 이미지 물리 삭제 ---
        if (!string.IsNullOrEmpty(comment.Content))
        {
            await DeleteInlineImagesAsync(comment.Content);
        }

        // --- 2. 첨부파일 물리 삭제 ---
        foreach (var attachment in comment.Attachments)
        {
            DeletePhysicalAttachment(attachment.StoredPath);
        }

        // Delete attachments and comment records from DB
        _context.Attachments.RemoveRange(comment.Attachments);
        _context.RequestComments.Remove(comment);
        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "COMMENT", commentId, "DELETE", null, $"RequestId: {requestId}");

        return NoContent();
    }
    
    // Update request (only creator can update)
    [HttpPut("{id}")]
    // UpdateRequest 액션 - 요청의 제목, 내용, 카테고리, 우선순위, ERP 시스템 등을 수정합니다.
    public async Task<IActionResult> UpdateRequest(int id, [FromBody] UpdateRequestRequest data)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null)
            return NotFound();
        
        // Only creator can update
        if (request.CreatedByUserId != GetCurrentUserId() && !IsInternalUser())
            return Forbid();
        
        request.Title = data.Title;
        request.Content = data.Content;
        request.Category = data.Category;
        request.Priority = data.Priority;
        request.ErpSystemId = data.ErpSystemId;
        request.UpdatedAt = DateTime.Now;
        
        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "REQUEST", request.RequestId, "UPDATE", null, "수정 완료");

        return NoContent();
    }
    
    // Delete request (only creator can delete when no comments)
    [HttpDelete("{id}")]
    // DeleteRequest 액션 - 작성자 본인이며 댓글이 없는 경우에만 요청과 첨부파일을 함께 삭제합니다.
    public async Task<IActionResult> DeleteRequest(int id)
    {
        var request = await _context.Requests
            .Include(r => r.Attachments)
            .Include(r => r.Comments)
                .ThenInclude(c => c.Attachments)
            .FirstOrDefaultAsync(r => r.RequestId == id);
        
        if (request == null)
            return NotFound();
        
        // Only creator can delete (internal users cannot delete others' requests)
        if (request.CreatedByUserId != GetCurrentUserId())
            return Forbid();
        
        // Can only delete if there are no comments
        if (request.Comments.Any())
            return BadRequest(new { message = "댓글이 있는 요청은 삭제할 수 없습니다." });
        
        // --- 1. 본문의 인라인 이미지 물리 삭제 ---
        if (!string.IsNullOrEmpty(request.Content))
        {
            await DeleteInlineImagesAsync(request.Content);
        }

        // --- 2. 첨부파일 물리 삭제 ---
        foreach (var attachment in request.Attachments)
        {
            DeletePhysicalAttachment(attachment.StoredPath);
        }

        foreach (var comment in request.Comments)
        {
            foreach (var attachment in comment.Attachments)
            {
                DeletePhysicalAttachment(attachment.StoredPath);
            }
        }

        // Delete attachments and request from DB
        _context.Attachments.RemoveRange(request.Attachments);
        _context.Requests.Remove(request);
        
        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "REQUEST", id, "DELETE", null, $"Title: {request.Title}");

        return NoContent();
    }
    
    [HttpGet("stats")]
    // GetStats 액션 - 요청 상태별 건수 등을 집계하여 대시보드에 사용하는 통계 정보를 반환합니다.
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

    // --- 물리 파일 삭제 헬퍼 메서드 ---
    
    private void DeletePhysicalAttachment(string storedPath)
    {
        if (string.IsNullOrEmpty(storedPath)) return;

        try
        {
            var normalizedPath = storedPath.Replace("/", Path.DirectorySeparatorChar.ToString());
            string filePath;
            
            if (normalizedPath.StartsWith("uploads" + Path.DirectorySeparatorChar) || Path.IsPathRooted(normalizedPath))
            {
                filePath = Path.Combine(_environment.ContentRootPath, normalizedPath);
            }
            else
            {
                var uploadPath = _configuration["FileStorage:UploadPath"] ?? "uploads";
                var basePath = Path.IsPathRooted(uploadPath) 
                    ? uploadPath 
                    : Path.Combine(_environment.ContentRootPath, uploadPath);
                filePath = Path.Combine(basePath, normalizedPath);
            }
            
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
            }
        }
        catch (Exception ex)
        {
            // 로그 기록이 가능하면 좋음 (실행 흐름을 막지는 않음)
            Console.WriteLine($"첨부파일 물리 삭제 실패: {ex.Message}");
        }
    }

    private Task DeleteInlineImagesAsync(string content)
    {
        if (string.IsNullOrEmpty(content)) return Task.CompletedTask;

        try
        {
            // src="/inline-images/포맷.webp" 형태에서 파일명 추출
            var imgTagRegex = new Regex(@"<img[^>]+src=""([^""]+)""[^>]*>", RegexOptions.IgnoreCase);
            var matches = imgTagRegex.Matches(content);

            var uploadPath = _configuration["FileStorage:UploadPath"] ?? "uploads";
            var basePath = Path.IsPathRooted(uploadPath) 
                ? uploadPath 
                : Path.Combine(_environment.ContentRootPath, uploadPath);
            var inlineImagesPath = Path.Combine(basePath, "inline-images");

            foreach (Match match in matches)
            {
                if (match.Groups.Count > 1)
                {
                    var srcUrl = match.Groups[1].Value;
                    if (srcUrl.StartsWith("/inline-images/"))
                    {
                        var fileName = srcUrl.Substring("/inline-images/".Length);
                        // URL 쿼리스트링 등이 묻어있는 경우 제거
                        if (fileName.Contains("?"))
                        {
                            fileName = fileName.Split('?')[0];
                        }
                        
                        var filePath = Path.Combine(inlineImagesPath, fileName);
                        if (System.IO.File.Exists(filePath))
                        {
                            System.IO.File.Delete(filePath);
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"인라인 이미지 물리 삭제 실패: {ex.Message}");
        }
        
        return Task.CompletedTask;
    }

    #endregion
}
