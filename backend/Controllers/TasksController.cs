using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using BnfErpPortal.Data;
using BnfErpPortal.DTOs;
using BnfErpPortal.Models;
using BnfErpPortal.Constants;
using BnfErpPortal.Services;
using ClosedXML.Excel;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.SignalR;
using BnfErpPortal.Hubs;

namespace BnfErpPortal.Controllers;

[ApiController]
[Route("api/tasks")]
[Authorize(Policy = AuthorizationPolicies.InternalStaff)]
public class TasksController : ControllerBase
{
    private static readonly Regex HtmlTagRegex = new Regex("<.*?>", RegexOptions.Compiled);

    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;
    private readonly IWebHostEnvironment _environment;
    private readonly IEmailTemplateService _emailTemplateService;
    private readonly IEmailQueueService _emailQueueService;
    private readonly IConfiguration _configuration;
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ILogger<TasksController> _logger;

    public TasksController(
        ApplicationDbContext context,
        IAuditLogService auditLogService,
        IWebHostEnvironment environment,
        IEmailTemplateService emailTemplateService,
        IEmailQueueService emailQueueService,
        IConfiguration configuration,
        IHubContext<NotificationHub> hubContext,
        ILogger<TasksController> logger)
    {
        _context = context;
        _auditLogService = auditLogService;
        _environment = environment;
        _emailTemplateService = emailTemplateService;
        _emailQueueService = emailQueueService;
        _configuration = configuration;
        _hubContext = hubContext;
        _logger = logger;
    }

    private int GetCurrentUserId()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrEmpty(userIdStr) ? 0 : int.Parse(userIdStr);
    }

    // GET: api/tasks
    [HttpGet]
    public async Task<ActionResult<PagedResult<TaskDto>>> GetTasks(
        [FromQuery] string? tab,
        [FromQuery] string? status,
        [FromQuery] string? priority,
        [FromQuery] string? category,
        [FromQuery] int? companyId,
        [FromQuery] string? sortKey,
        [FromQuery] string? sortDir,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 15)
    {
        var currentUserId = GetCurrentUserId();
        var query = _context.InternalTasks
            .AsNoTracking()
            .Include(t => t.CreatedBy)
            .Include(t => t.AssignedTo)
            .Include(t => t.Company)
            .Include(t => t.ErpSystem)
            .Include(t => t.Comments)
            .AsQueryable();

        // 필터: assigned (내게 할당) / created (내가 지시)
        if (tab == "created")
        {
            query = query.Where(t => t.CreatedByUserId == currentUserId);
        }
        else if (tab == "referenced")
        {
            query = query.Where(t => t.ReferenceUsers.Any(r => r.UserId == currentUserId));
        }
        else
        {
            query = query.Where(t => t.AssignedToUserId == currentUserId);
        }

        // 필터
        if (!string.IsNullOrEmpty(status))
            query = query.Where(t => t.Status == status);
        if (!string.IsNullOrEmpty(priority))
            query = query.Where(t => t.Priority == priority);
        if (!string.IsNullOrEmpty(category))
            query = query.Where(t => t.Category == category);
        if (companyId.HasValue)
            query = query.Where(t => t.CompanyId == companyId.Value);

        var totalCount = await query.CountAsync();

        // 정렬
        bool isAsc = string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);
        query = sortKey?.ToLower() switch
        {
            "title" => isAsc ? query.OrderBy(t => t.Title) : query.OrderByDescending(t => t.Title),
            "priority" => isAsc ? query.OrderBy(t => t.Priority) : query.OrderByDescending(t => t.Priority),
            "status" => isAsc ? query.OrderBy(t => t.Status) : query.OrderByDescending(t => t.Status),
            "duedate" => isAsc ? query.OrderBy(t => t.DueDate) : query.OrderByDescending(t => t.DueDate),
            "assignedto" => isAsc ? query.OrderBy(t => t.AssignedTo.Name) : query.OrderByDescending(t => t.AssignedTo.Name),
            "createdby" => isAsc ? query.OrderBy(t => t.CreatedBy.Name) : query.OrderByDescending(t => t.CreatedBy.Name),
            "company" => isAsc ? query.OrderBy(t => t.Company != null ? t.Company.Name : "") : query.OrderByDescending(t => t.Company != null ? t.Company.Name : ""),
            _ => query.OrderByDescending(t => t.CreatedAt)
        };

        var tasks = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new TaskDto
            {
                TaskId = t.TaskId,
                CompanyId = t.CompanyId,
                CompanyName = t.Company != null ? t.Company.Name : null,
                ErpSystemId = t.ErpSystemId,
                ErpSystemName = t.ErpSystem != null ? t.ErpSystem.Name : null,
                Title = t.Title,
                Content = t.Content,
                Category = t.Category,
                Priority = t.Priority,
                Status = t.Status,
                CreatedBy = new UserDto { UserId = t.CreatedBy.UserId, Name = t.CreatedBy.Name, Email = t.CreatedBy.Email, Role = t.CreatedBy.Role },
                AssignedTo = new UserDto { UserId = t.AssignedTo.UserId, Name = t.AssignedTo.Name, Email = t.AssignedTo.Email, Role = t.AssignedTo.Role },
                DueDate = t.DueDate,
                StartedAt = t.StartedAt,
                CompletedAt = t.CompletedAt,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt,
                CommentsCount = t.Comments.Count
            })
            .ToListAsync();

        return Ok(new PagedResult<TaskDto>
        {
            Items = tasks,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }

    // GET: api/tasks/export
    [HttpGet("export")]
    public async Task<IActionResult> ExportTasksToExcel(
        [FromQuery] string? status,
        [FromQuery] string? priority,
        [FromQuery] string? category,
        [FromQuery] int? companyId,
        [FromQuery] string? search)
    {
        var currentUserId = GetCurrentUserId();
        
        var baseQuery = _context.InternalTasks
            .AsNoTracking()
            .Include(t => t.CreatedBy)
            .Include(t => t.AssignedTo)
            .Include(t => t.Company)
            .Include(t => t.ErpSystem)
            .Include(t => t.Comments)
            .AsQueryable();

        // 필터 적용
        if (!string.IsNullOrEmpty(status))
            baseQuery = baseQuery.Where(t => t.Status == status);
        if (!string.IsNullOrEmpty(priority))
            baseQuery = baseQuery.Where(t => t.Priority == priority);
        if (!string.IsNullOrEmpty(category))
            baseQuery = baseQuery.Where(t => t.Category == category);
        if (companyId.HasValue)
            baseQuery = baseQuery.Where(t => t.CompanyId == companyId.Value);
            
        if (!string.IsNullOrEmpty(search))
        {
            var q = search.ToLower();
            baseQuery = baseQuery.Where(t => 
                t.Title.ToLower().Contains(q) || 
                t.Content.ToLower().Contains(q) || 
                (t.Company != null && t.Company.Name.ToLower().Contains(q)));
        }

        // 지시받은 업무 (Assigned)
        var assignedTasks = await baseQuery
            .Where(t => t.AssignedToUserId == currentUserId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new TaskExportDto {
                TaskId = t.TaskId,
                Category = t.Category,
                Priority = t.Priority,
                Status = t.Status,
                Title = t.Title,
                Content = t.Content ?? "",
                CompanyName = t.Company != null ? t.Company.Name : "",
                CreatedByName = t.CreatedBy != null ? t.CreatedBy.Name : "",
                AssignedToName = t.AssignedTo != null ? t.AssignedTo.Name : "",
                DueDate = t.DueDate,
                CreatedAt = t.CreatedAt
            })
            .Take(1000)
            .ToListAsync();

        // 지시한 업무 (Created)
        var createdTasks = await baseQuery
            .Where(t => t.CreatedByUserId == currentUserId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new TaskExportDto {
                TaskId = t.TaskId,
                Category = t.Category,
                Priority = t.Priority,
                Status = t.Status,
                Title = t.Title,
                Content = t.Content ?? "",
                CompanyName = t.Company != null ? t.Company.Name : "",
                CreatedByName = t.CreatedBy != null ? t.CreatedBy.Name : "",
                AssignedToName = t.AssignedTo != null ? t.AssignedTo.Name : "",
                DueDate = t.DueDate,
                CreatedAt = t.CreatedAt
            })
            .Take(1000)
            .ToListAsync();

        using var workbook = new XLWorkbook();
        
        // 시트 생성 공통 함수
        void BuildTaskSheet(IXLWorksheet ws, string title, List<TaskExportDto> list)
        {
            ws.Range("A1:K1").Merge().Value = title;
            ws.Cell("A1").Style.Font.Bold = true;
            ws.Cell("A1").Style.Font.FontSize = 18;
            ws.Cell("A1").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            ws.Cell("A1").Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            ws.Row(1).Height = 35;

            var headers = new[] { "번호", "업무분류", "우선순위", "처리상태", "업무제목", "업무내용", "회사명", "지시자", "담당자", "마감일", "등록일" };
            for (int i = 0; i < headers.Length; i++)
            {
                ws.Cell(2, i + 1).Value = headers[i];
                ws.Cell(2, i + 1).Style.Font.Bold = true;
                ws.Cell(2, i + 1).Style.Fill.BackgroundColor = XLColor.LightGray;
                ws.Cell(2, i + 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                ws.Cell(2, i + 1).Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            }

            ws.Range(2, 1, 2, headers.Length).SetAutoFilter();

            var statusLabels = new Dictionary<string, string>
            {
                { "PENDING", "대기" },
                { "IN_PROGRESS", "진행중" },
                { "COMPLETED", "완료" },
                { "CANCELLED", "취소" }
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
                { "GENERAL", "일반" },
                { "DEVELOPMENT", "개발" },
                { "REVIEW", "검토/리뷰" },
                { "MEETING", "회의" },
                { "OTHER", "기타" }
            };

            int row = 3;
            foreach (var t in list)
            {
                var plainContent = HtmlTagRegex.Replace(t.Content, String.Empty);
                plainContent = System.Net.WebUtility.HtmlDecode(plainContent);

                ws.Cell(row, 1).Value = t.TaskId;
                ws.Cell(row, 2).Value = categoryLabels.ContainsKey(t.Category) ? categoryLabels[t.Category] : t.Category;
                ws.Cell(row, 3).Value = priorityLabels.ContainsKey(t.Priority) ? priorityLabels[t.Priority] : t.Priority;
                ws.Cell(row, 4).Value = statusLabels.ContainsKey(t.Status) ? statusLabels[t.Status] : t.Status;
                ws.Cell(row, 5).Value = t.Title;
                ws.Cell(row, 6).Value = plainContent;
                ws.Cell(row, 7).Value = t.CompanyName;
                ws.Cell(row, 8).Value = t.CreatedByName;
                ws.Cell(row, 9).Value = t.AssignedToName;
                ws.Cell(row, 10).Value = t.DueDate?.ToString("yyyy-MM-dd HH:mm");
                ws.Cell(row, 11).Value = t.CreatedAt.ToString("yyyy-MM-dd HH:mm");

                ws.Range(row, 1, row, headers.Length).Style.Alignment.WrapText = true;
                ws.Range(row, 1, row, headers.Length).Style.Alignment.Vertical = XLAlignmentVerticalValues.Top;

                row++;
            }

            ws.Columns().AdjustToContents();
            foreach (var col in ws.ColumnsUsed())
            {
                var calculatedWidth = (col.Width * 1.3) + 4;
                col.Width = calculatedWidth < 14 ? 14 : calculatedWidth;
            }
            if (ws.Column(5).Width < 30) ws.Column(5).Width = 30; // 제목
            if (ws.Column(6).Width > 100) ws.Column(6).Width = 100; // 내용
            else if (ws.Column(6).Width < 40) ws.Column(6).Width = 40;
        }

        var wsAssigned = workbook.Worksheets.Add("지시받은 업무");
        BuildTaskSheet(wsAssigned, "내게 할당된 업무", assignedTasks);

        var wsCreated = workbook.Worksheets.Add("지시한 업무");
        BuildTaskSheet(wsCreated, "내가 지시한 업무", createdTasks);

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        var content = stream.ToArray();

        string fileName = $"tasks_export_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";
        return File(content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    // GET: api/tasks/stats
    [HttpGet("stats")]
    public async Task<ActionResult<TaskStatsDto>> GetStats()
    {
        var currentUserId = GetCurrentUserId();
        var query = _context.InternalTasks
            .Where(t =>
                t.AssignedToUserId == currentUserId ||
                t.CreatedByUserId == currentUserId ||
                t.ReferenceUsers.Any(r => r.UserId == currentUserId));

        var stats = new TaskStatsDto
        {
            Total = await query.CountAsync(),
            Pending = await query.CountAsync(t => t.Status == "PENDING"),
            InProgress = await query.CountAsync(t => t.Status == "IN_PROGRESS"),
            Completed = await query.CountAsync(t => t.Status == "COMPLETED"),
            Cancelled = await query.CountAsync(t => t.Status == "CANCELLED")
        };

        return Ok(stats);
    }

    // GET: api/tasks/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<TaskDto>> GetTask(int id)
    {
        var currentUserId = GetCurrentUserId();
        var task = await _context.InternalTasks
            .AsNoTracking()
            .Include(t => t.CreatedBy)
            .Include(t => t.AssignedTo)
            .Include(t => t.Company)
            .Include(t => t.ErpSystem)
            .Include(t => t.Comments)
            .Include(t => t.Attachments)
            .Include(t => t.ReferenceUsers)
                .ThenInclude(r => r.User)
            .FirstOrDefaultAsync(t => t.TaskId == id);

        if (task == null) return NotFound();
        if (!CanAccessTask(task, currentUserId)) return Forbid();

        return Ok(new TaskDto
        {
            TaskId = task.TaskId,
            CompanyId = task.CompanyId,
            CompanyName = task.Company?.Name,
            ErpSystemId = task.ErpSystemId,
            ErpSystemName = task.ErpSystem?.Name,
            Title = task.Title,
            Content = task.Content,
            Category = task.Category,
            Priority = task.Priority,
            Status = task.Status,
            CreatedBy = new UserDto { UserId = task.CreatedBy.UserId, Name = task.CreatedBy.Name, Email = task.CreatedBy.Email, Role = task.CreatedBy.Role },
            AssignedTo = new UserDto { UserId = task.AssignedTo.UserId, Name = task.AssignedTo.Name, Email = task.AssignedTo.Email, Role = task.AssignedTo.Role },
            DueDate = task.DueDate,
            StartedAt = task.StartedAt,
            CompletedAt = task.CompletedAt,
            CreatedAt = task.CreatedAt,
            UpdatedAt = task.UpdatedAt,
            CommentsCount = task.Comments.Count,
            Attachments = task.Attachments
                .Where(a => a.TaskCommentId == null)
                .Select(a => new TaskAttachmentDto
                {
                    TaskAttachmentId = a.TaskAttachmentId,
                    TaskCommentId = a.TaskCommentId,
                    FileName = a.FileName,
                    FileSize = a.FileSize,
                    ContentType = a.ContentType,
                    CreatedAt = a.CreatedAt
                }).ToList(),
            ReferenceUsers = task.ReferenceUsers
                .OrderBy(r => r.User.Name)
                .Select(r => new UserDto
                {
                    UserId = r.User.UserId,
                    Name = r.User.Name,
                    Email = r.User.Email,
                    Role = r.User.Role,
                    CompanyId = r.User.CompanyId
                }).ToList()
        });
    }

    // POST: api/tasks
    [HttpPost]
    public async Task<ActionResult<TaskDto>> CreateTask([FromBody] CreateTaskRequest request)
    {
        var currentUserId = GetCurrentUserId();
        if (!await IsValidInternalTaskUserAsync(request.AssignedToUserId))
            return BadRequest(new { message = "담당자는 비엔에프소프트 내부 활성 사용자만 지정할 수 있습니다." });

        var referenceUserIds = await ValidateReferenceUserIdsAsync(
            request.ReferenceUserIds,
            currentUserId,
            request.AssignedToUserId);

        if (referenceUserIds == null)
            return BadRequest(new { message = "참조자는 비엔에프소프트 내부 활성 사용자만 지정할 수 있습니다." });

        var task = new InternalTask
        {
            CreatedByUserId = currentUserId,
            AssignedToUserId = request.AssignedToUserId,
            CompanyId = request.CompanyId,
            ErpSystemId = request.ErpSystemId,
            Title = request.Title,
            Content = request.Content,
            Category = request.Category,
            Priority = request.Priority,
            Status = "PENDING",
            DueDate = request.DueDate,
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now
        };

        _context.InternalTasks.Add(task);
        await _context.SaveChangesAsync();

        if (referenceUserIds.Count > 0)
        {
            var references = referenceUserIds.Select(userId => new TaskReference
            {
                TaskId = task.TaskId,
                UserId = userId,
                AddedByUserId = currentUserId,
                CreatedAt = DateTime.Now
            });
            _context.TaskReferences.AddRange(references);
            await _context.SaveChangesAsync();
        }

        await _auditLogService.LogActionAsync(currentUserId, "TASK", task.TaskId, "CREATE", null, $"Title: {task.Title}");

        // Reload with navigation properties
        await _context.Entry(task).Reference(t => t.CreatedBy).LoadAsync();
        await _context.Entry(task).Reference(t => t.AssignedTo).LoadAsync();
        if (task.CompanyId.HasValue)
            await _context.Entry(task).Reference(t => t.Company).LoadAsync();
        if (task.ErpSystemId.HasValue)
            await _context.Entry(task).Reference(t => t.ErpSystem).LoadAsync();
        await _context.Entry(task).Collection(t => t.ReferenceUsers).Query().Include(r => r.User).LoadAsync();

        if (task.AssignedToUserId != currentUserId)
        {
            await SendTaskNotificationAsync(
                task.AssignedToUserId, 
                task, 
                $"새로운 업무 '{task.Title}'이(가) 배정되었습니다.", 
                "TASK_ASSIGNED"
            );
        }

        foreach (var referenceUserId in referenceUserIds.Where(userId => userId != currentUserId && userId != task.AssignedToUserId))
        {
            await SendTaskNotificationAsync(
                referenceUserId,
                task,
                $"업무 '{task.Title}'이(가) 참조자로 지정되었습니다.",
                "TASK_REFERENCED"
            );
        }

        return CreatedAtAction(nameof(GetTask), new { id = task.TaskId }, new TaskDto
        {
            TaskId = task.TaskId,
            CompanyId = task.CompanyId,
            CompanyName = task.Company?.Name,
            ErpSystemId = task.ErpSystemId,
            ErpSystemName = task.ErpSystem?.Name,
            Title = task.Title,
            Content = task.Content,
            Category = task.Category,
            Priority = task.Priority,
            Status = task.Status,
            CreatedBy = new UserDto { UserId = task.CreatedBy.UserId, Name = task.CreatedBy.Name, Email = task.CreatedBy.Email, Role = task.CreatedBy.Role },
            AssignedTo = new UserDto { UserId = task.AssignedTo.UserId, Name = task.AssignedTo.Name, Email = task.AssignedTo.Email, Role = task.AssignedTo.Role },
            DueDate = task.DueDate,
            StartedAt = task.StartedAt,
            CompletedAt = task.CompletedAt,
            CreatedAt = task.CreatedAt,
            UpdatedAt = task.UpdatedAt,
            CommentsCount = 0,
            ReferenceUsers = task.ReferenceUsers
                .OrderBy(r => r.User.Name)
                .Select(r => new UserDto
                {
                    UserId = r.User.UserId,
                    Name = r.User.Name,
                    Email = r.User.Email,
                    Role = r.User.Role,
                    CompanyId = r.User.CompanyId
                }).ToList()
        });
    }

    // PUT: api/tasks/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTask(int id, [FromBody] UpdateTaskRequest request)
    {
        var currentUserId = GetCurrentUserId();
        var task = await _context.InternalTasks.FindAsync(id);
        if (task == null) return NotFound();
        if (!await IsValidInternalTaskUserAsync(request.AssignedToUserId))
            return BadRequest(new { message = "담당자는 비엔에프소프트 내부 활성 사용자만 지정할 수 있습니다." });

        var hasComments = await _context.TaskComments.AnyAsync(c => c.TaskId == id);
        if (hasComments)
        {
            return BadRequest(new { message = "코멘트가 달린 업무는 수정할 수 없습니다." });
        }

        if (task.CreatedByUserId != currentUserId)
            return Forbid();

        var oldAssignedToUserId = task.AssignedToUserId;
        var referenceUserIds = await ValidateReferenceUserIdsAsync(
            request.ReferenceUserIds,
            task.CreatedByUserId,
            request.AssignedToUserId);
        if (referenceUserIds == null)
            return BadRequest(new { message = "참조자는 비엔에프소프트 내부 활성 사용자만 지정할 수 있습니다." });

        var existingReferences = await _context.TaskReferences
            .Where(r => r.TaskId == id)
            .ToListAsync();

        task.Title = request.Title;
        task.Content = request.Content;
        task.Category = request.Category;
        task.Priority = request.Priority;
        task.AssignedToUserId = request.AssignedToUserId;
        task.CompanyId = request.CompanyId;
        task.ErpSystemId = request.ErpSystemId;
        task.DueDate = request.DueDate;
        task.UpdatedAt = DateTime.Now;

        var referenceUserSet = referenceUserIds.ToHashSet();
        var existingReferenceUserSet = existingReferences.Select(r => r.UserId).ToHashSet();
        var referencesToRemove = existingReferences
            .Where(r => !referenceUserSet.Contains(r.UserId))
            .ToList();
        var referenceUserIdsToAdd = referenceUserSet
            .Where(userId => !existingReferenceUserSet.Contains(userId))
            .ToList();

        if (referencesToRemove.Count > 0)
            _context.TaskReferences.RemoveRange(referencesToRemove);

        if (referenceUserIdsToAdd.Count > 0)
        {
            var referencesToAdd = referenceUserIdsToAdd.Select(userId => new TaskReference
            {
                TaskId = task.TaskId,
                UserId = userId,
                AddedByUserId = currentUserId,
                CreatedAt = DateTime.Now
            });
            _context.TaskReferences.AddRange(referencesToAdd);
        }

        await _context.SaveChangesAsync();
        await _auditLogService.LogActionAsync(currentUserId, "TASK", id, "UPDATE", null, $"Title: {task.Title}");

        // 알림 발송 (수정 시 담당자가 변경되었거나 기존과 다르게 배정된 경우)
        if (task.AssignedToUserId != oldAssignedToUserId && task.AssignedToUserId != currentUserId)
        {
            await SendTaskNotificationAsync(
                task.AssignedToUserId,
                task,
                $"새로운 업무 '{task.Title}'이(가) 배정되었습니다.",
                "TASK_ASSIGNED"
            );
        }

        foreach (var referenceUserId in referenceUserIdsToAdd.Where(userId => userId != currentUserId && userId != task.AssignedToUserId))
        {
            await SendTaskNotificationAsync(
                referenceUserId,
                task,
                $"업무 '{task.Title}'이(가) 참조자로 지정되었습니다.",
                "TASK_REFERENCED"
            );
        }

        return NoContent();
    }

    // PATCH: api/tasks/{id}/status
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateTaskStatusRequest request)
    {
        var currentUserId = GetCurrentUserId();
        var task = await _context.InternalTasks.FindAsync(id);
        if (task == null) return NotFound();

        if (request.Status == "CANCELLED")
        {
            if (task.CreatedByUserId != currentUserId)
                return Forbid();
        }
        else
        {
            if (task.AssignedToUserId != currentUserId)
                return Forbid();
        }

        var oldStatus = task.Status;
        task.Status = request.Status;
        task.UpdatedAt = DateTime.Now;

        // 착수 시간 자동 기록
        if (request.Status == "IN_PROGRESS" && task.StartedAt == null)
            task.StartedAt = DateTime.Now;

        // 완료 시간 자동 기록
        if (request.Status == "COMPLETED")
            task.CompletedAt = DateTime.Now;

        await _context.SaveChangesAsync();
        await _auditLogService.LogActionAsync(currentUserId, "TASK", id, "STATUS_CHANGE", oldStatus, request.Status);

        // 업무가 '완료' 상태로 변경된 경우 지시자에게 알림 발송 (단, 본인이 지시한 업무를 본인이 완료한 경우는 제외)
        if (request.Status == "COMPLETED" && oldStatus != "COMPLETED" && task.CreatedByUserId != currentUserId)
        {
            await SendTaskNotificationAsync(
                task.CreatedByUserId,
                task,
                $"지시한 업무 '{task.Title}'이(가) 완료되었습니다.",
                "TASK_COMPLETED"
            );
        }

        if (request.Status == "COMPLETED" && oldStatus != "COMPLETED")
        {
            var referenceUserIds = await _context.TaskReferences
                .AsNoTracking()
                .Where(r => r.TaskId == id)
                .Select(r => r.UserId)
                .Distinct()
                .ToListAsync();

            foreach (var referenceUserId in referenceUserIds.Where(userId => userId != currentUserId && userId != task.CreatedByUserId))
            {
                await SendTaskNotificationAsync(
                    referenceUserId,
                    task,
                    $"참조 업무 '{task.Title}'이 완료되었습니다.",
                    "TASK_COMPLETED"
                );
            }
        }

        return NoContent();
    }

    // DELETE: api/tasks/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        var currentUserId = GetCurrentUserId();
        var task = await _context.InternalTasks.FindAsync(id);
        if (task == null) return NotFound();

        var hasComments = await _context.TaskComments.AnyAsync(c => c.TaskId == id);
        if (hasComments)
        {
            return BadRequest(new { message = "코멘트가 달린 업무는 삭제할 수 없습니다." });
        }

        if (task.CreatedByUserId != currentUserId)
            return Forbid();

        await _auditLogService.LogActionAsync(currentUserId, "TASK", id, "DELETE", null, $"Title: {task.Title}");

        // 업무와 연결된 인앱 알림도 함께 정리
        var storedTypeSuffix = $":{id}";
        var quotedTaskTitle = $"'{task.Title}'";
        var relatedNotifications = await _context.Notifications
            .Where(n =>
                // 신규 형식: TASK_XXX:{TaskId}
                (n.Type.StartsWith("TASK_") && n.Type.EndsWith(storedTypeSuffix)) ||
                // 과거 형식 정리: TASK / TASK_ASSIGNED / TASK_COMPLETED
                (
                    (n.Type == "TASK" || n.Type == "TASK_ASSIGNED" || n.Type == "TASK_COMPLETED") &&
                    (n.Message.Contains(quotedTaskTitle) || n.RequestId == id)
                )
            )
            .ToListAsync();

        if (relatedNotifications.Count > 0)
        {
            _context.Notifications.RemoveRange(relatedNotifications);
        }

        _context.InternalTasks.Remove(task);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // GET: api/tasks/{id}/comments
    [HttpGet("{id}/comments")]
    public async Task<ActionResult<List<TaskCommentDto>>> GetComments(int id)
    {
        var currentUserId = GetCurrentUserId();
        if (!await CanAccessTaskAsync(id, currentUserId))
            return Forbid();

        var comments = await _context.TaskComments
            .AsNoTracking()
            .Where(c => c.TaskId == id)
            .Include(c => c.User)
            .Include(c => c.Attachments)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new TaskCommentDto
            {
                TaskCommentId = c.TaskCommentId,
                TaskId = c.TaskId,
                User = new UserDto { UserId = c.User.UserId, Name = c.User.Name, Email = c.User.Email, Role = c.User.Role },
                Content = c.Content,
                CreatedAt = c.CreatedAt,
                Attachments = c.Attachments.Select(a => new TaskAttachmentDto
                {
                    TaskAttachmentId = a.TaskAttachmentId,
                    TaskCommentId = a.TaskCommentId,
                    FileName = a.FileName,
                    FileSize = a.FileSize,
                    ContentType = a.ContentType,
                    CreatedAt = a.CreatedAt
                }).ToList()
            })
            .ToListAsync();

        return Ok(comments);
    }

    // POST: api/tasks/{id}/comments
    [HttpPost("{id}/comments")]
    public async Task<ActionResult<TaskCommentDto>> CreateComment(int id, [FromBody] CreateTaskCommentRequest request)
    {
        var currentUserId = GetCurrentUserId();
        var task = await _context.InternalTasks.FindAsync(id);
        if (task == null) return NotFound();
        if (!await CanAccessTaskAsync(id, currentUserId))
            return Forbid();

        var comment = new TaskComment
        {
            TaskId = id,
            UserId = currentUserId,
            Content = request.Content,
            CreatedAt = DateTime.Now
        };

        _context.TaskComments.Add(comment);
        await _context.SaveChangesAsync();

        await _auditLogService.LogActionAsync(currentUserId, "TASK_COMMENT", comment.TaskCommentId, "CREATE", null, $"TaskId: {id}");

        await _context.Entry(comment).Reference(c => c.User).LoadAsync();

        // Assignee comment/report should notify the task creator.
        if (task.AssignedToUserId == currentUserId && task.CreatedByUserId != currentUserId)
        {
            await SendTaskNotificationAsync(
                task.CreatedByUserId,
                task,
                $"담당자 '{comment.User.Name}'님이 업무 '{task.Title}'에 코멘트/보고를 등록했습니다.",
                "TASK_COMMENTED"
            );
        }

        if (task.AssignedToUserId == currentUserId)
        {
            var referenceUserIds = await _context.TaskReferences
                .AsNoTracking()
                .Where(r => r.TaskId == id)
                .Select(r => r.UserId)
                .Distinct()
                .ToListAsync();

            foreach (var referenceUserId in referenceUserIds.Where(userId => userId != currentUserId && userId != task.CreatedByUserId))
            {
                await SendTaskNotificationAsync(
                    referenceUserId,
                    task,
                    $"업무 '{task.Title}'에 담당자 코멘트/보고가 등록되었습니다.",
                    "TASK_COMMENTED"
                );
            }
        }

        return CreatedAtAction(nameof(GetComments), new { id }, new TaskCommentDto
        {
            TaskCommentId = comment.TaskCommentId,
            TaskId = comment.TaskId,
            User = new UserDto { UserId = comment.User.UserId, Name = comment.User.Name, Email = comment.User.Email, Role = comment.User.Role },
            Content = comment.Content,
            CreatedAt = comment.CreatedAt
        });
    }

    // DELETE: api/tasks/{id}/comments/{commentId}
    [HttpDelete("{id}/comments/{commentId}")]
    public async Task<IActionResult> DeleteComment(int id, int commentId)
    {
        var currentUserId = GetCurrentUserId();
        if (!await CanAccessTaskAsync(id, currentUserId))
            return Forbid();

        var comment = await _context.TaskComments
            .Include(c => c.Attachments)
            .FirstOrDefaultAsync(c => c.TaskCommentId == commentId && c.TaskId == id);
            
        if (comment == null) return NotFound();

        // 마지막 코멘트 여부 확인
        var lastComment = await _context.TaskComments
            .Where(c => c.TaskId == id)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync();

        if (lastComment != null && lastComment.TaskCommentId != commentId)
        {
            return BadRequest(new { message = "마지막으로 작성된 코멘트만 삭제할 수 있습니다." });
        }

        if (comment.UserId != currentUserId)
            return Forbid();

        // 첨부파일 물리 삭제 및 DB 레코드 삭제 (Cascade 보완)
        if (comment.Attachments != null && comment.Attachments.Any())
        {
            foreach (var attachment in comment.Attachments)
            {
                var normalizedPath = attachment.StoredPath.Replace("/", Path.DirectorySeparatorChar.ToString());
                var filePath = Path.Combine(_environment.ContentRootPath, normalizedPath);
                if (System.IO.File.Exists(filePath))
                {
                    System.IO.File.Delete(filePath);
                }
            }
            _context.TaskAttachments.RemoveRange(comment.Attachments);
        }

        await _auditLogService.LogActionAsync(currentUserId, "TASK_COMMENT", commentId, "DELETE", null, $"TaskId: {id}");

        _context.TaskComments.Remove(comment);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // GET: api/tasks/users - 내부 직원 목록 (업무 담당자 선택용)
    [HttpGet("users")]
    public async Task<ActionResult> GetInternalUsers()
    {
        var users = await _context.Users
            .AsNoTracking()
            .Where(u =>
                u.IsActive &&
                u.CompanyId == BnfCompany.CompanyId &&
                UserRoles.InternalRoles.Contains(u.Role))
            .OrderBy(u => u.Name)
            .Select(u => new { u.UserId, u.Name, u.Email, u.Role })
            .ToListAsync();

        return Ok(users);
    }

    // GET: api/tasks/companies - 활성 회사 목록 (업무 지시 시 선택용)
    [HttpGet("companies")]
    public async Task<ActionResult> GetCompanies()
    {
        var companies = await _context.Companies
            .AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name)
            .Select(c => new { c.CompanyId, c.Name, c.Code })
            .ToListAsync();

        return Ok(companies);
    }

    // GET: api/tasks/erp-systems?companyId=1 - 특정 회사의 ERP 시스템 목록
    [HttpGet("erp-systems")]
    public async Task<ActionResult> GetErpSystems([FromQuery] int? companyId)
    {
        var query = _context.ErpSystems
            .AsNoTracking()
            .Where(e => e.IsActive);

        if (companyId.HasValue)
            query = query.Where(e => e.CompanyId == companyId.Value);

        var systems = await query
            .OrderBy(e => e.Name)
            .Select(e => new { e.ErpSystemId, e.Name, e.CompanyId })
            .ToListAsync();

        return Ok(systems);
    }

    private async Task SendTaskNotificationAsync(int userId, InternalTask task, string message, string type)
    {
        var storedType = BuildStoredTaskNotificationType(type, task.TaskId);

        // 1. In-App Notification
        var notification = new Notification
        {
            UserId = userId,
            Message = message,
            Type = storedType,
            RequestId = null,
            IsRead = false,
            CreatedAt = DateTime.Now
        };
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        // 2. Real-time Notification (SignalR)
        try
        {
            await _hubContext.Clients.Group($"User_{userId}").SendAsync("ReceiveNotification", new
            {
                Type = MapToRealtimeNotificationType(type),
                TaskId = task.TaskId,
                Title = task.Title,
                Message = message,
                CreatedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SignalR 업무 알림 전송 실패: UserId={UserId}, TaskId={TaskId}", userId, task.TaskId);
        }

        // 3. Email Notification
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserId == userId);
        if (user == null || string.IsNullOrWhiteSpace(user.Email))
        {
            return;
        }

        try
        {
            var taskLink = $"{GetPortalBaseUrl()}/admin/tasks/{task.TaskId}";

            var mailData = new Dictionary<string, string>
            {
                { "UserName", user.Name },
                { "TaskTitle", task.Title },
                { "Category", task.Category ?? "미지정" },
                { "Priority", task.Priority ?? "NORMAL" },
                { "DueDate", task.DueDate?.ToString("yyyy-MM-dd HH:mm") ?? "미지정" },
                { "TaskLink", taskLink },
                { "NotificationMessage", message }
            };

            var (subject, body) = await _emailTemplateService.RenderAsync("TASK_NOTIFICATION", mailData);
            if (!string.IsNullOrWhiteSpace(subject) && !string.IsNullOrWhiteSpace(body))
            {
                await _emailQueueService.QueueAsync(user.Email, subject, body);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "업무 지시 메일 발송 실패: UserId={UserId}, TaskId={TaskId}", userId, task.TaskId);
        }
    }

    private string GetPortalBaseUrl()
    {
        var configuredBaseUrl = _configuration["AppSettings:BaseUrl"] ?? _configuration["App:BaseUrl"];
        if (!string.IsNullOrWhiteSpace(configuredBaseUrl) &&
            Uri.TryCreate(configuredBaseUrl, UriKind.Absolute, out var configuredUri) &&
            !configuredUri.IsLoopback)
        {
            return configuredBaseUrl.TrimEnd('/');
        }

        return $"{Request.Scheme}://{Request.Host}".TrimEnd('/');
    }

    private static string MapToRealtimeNotificationType(string type)
    {
        return type switch
        {
            "TASK_ASSIGNED" => "TaskAssigned",
            "TASK_COMPLETED" => "TaskCompleted",
            _ => "TaskNotification"
        };
    }

    private static string BuildStoredTaskNotificationType(string baseType, int taskId)
    {
        return $"{baseType}:{taskId}";
    }

    private static bool CanAccessTask(InternalTask task, int userId)
    {
        return task.CreatedByUserId == userId
            || task.AssignedToUserId == userId
            || task.ReferenceUsers.Any(r => r.UserId == userId);
    }

    private async Task<bool> CanAccessTaskAsync(int taskId, int userId)
    {
        return await _context.InternalTasks
            .AsNoTracking()
            .AnyAsync(t =>
                t.TaskId == taskId &&
                (t.CreatedByUserId == userId ||
                 t.AssignedToUserId == userId ||
                 t.ReferenceUsers.Any(r => r.UserId == userId)));
    }

    private async Task<bool> IsValidInternalTaskUserAsync(int userId)
    {
        return await _context.Users
            .AsNoTracking()
            .AnyAsync(u =>
                u.UserId == userId &&
                u.IsActive &&
                u.CompanyId == BnfCompany.CompanyId &&
                UserRoles.InternalRoles.Contains(u.Role));
    }

    private async Task<List<int>?> ValidateReferenceUserIdsAsync(IEnumerable<int>? requestedUserIds, int createdByUserId, int assignedToUserId)
    {
        var candidateIds = requestedUserIds?
            .Where(id => id > 0)
            .Distinct()
            .Where(id => id != createdByUserId && id != assignedToUserId)
            .ToList() ?? new List<int>();

        if (candidateIds.Count == 0)
            return candidateIds;

        var validIds = await _context.Users
            .AsNoTracking()
            .Where(u =>
                candidateIds.Contains(u.UserId) &&
                u.IsActive &&
                u.CompanyId == BnfCompany.CompanyId &&
                UserRoles.InternalRoles.Contains(u.Role))
            .Select(u => u.UserId)
            .ToListAsync();

        return validIds.Count == candidateIds.Count ? validIds : null;
    }

    public class TaskExportDto
    {
        public int TaskId { get; set; }
        public string Category { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public string CreatedByName { get; set; } = string.Empty;
        public string AssignedToName { get; set; } = string.Empty;
        public DateTime? DueDate { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
