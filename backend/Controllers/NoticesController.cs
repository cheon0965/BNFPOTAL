using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using BnfErpPortal.Data;
using BnfErpPortal.DTOs;
using BnfErpPortal.Models;
using BnfErpPortal.Constants;
using BnfErpPortal.Services;

namespace BnfErpPortal.Controllers;

[ApiController]
[Route("api/notices")]
public class NoticesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly IAuditLogService _auditLogService;
    
    public NoticesController(
        ApplicationDbContext context, 
        IConfiguration configuration,
        IWebHostEnvironment environment,
        IAuditLogService auditLogService)
    {
        _context = context;
        _configuration = configuration;
        _environment = environment;
        _auditLogService = auditLogService;
    }
    
    // GetCurrentUserId 액션 - 데이터를 조회합니다.
    private int GetCurrentUserId()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrEmpty(userIdStr) ? 0 : int.Parse(userIdStr);
    }
    
    // GetCurrentRole 액션 - 데이터를 조회합니다.
    private string GetCurrentRole() => User.FindFirstValue(ClaimTypes.Role) ?? "";
    // IsInternalUser 액션 - 처리를 수행합니다.
    private bool IsInternalUser() => new[] { "ADMIN", "MANAGER", "ENGINEER" }.Contains(GetCurrentRole());
    
    // GET: api/notices - 공지사항 목록 조회 (모든 인증 사용자)
    [HttpGet]
    [Authorize]
    // GetNotices 액션 - 활성화된 공지사항을 고정 여부, 검색어, 페이징 조건으로 조회하고 리스트 형태로 반환합니다.
    public async Task<ActionResult<PagedResult<NoticeListDto>>> GetNotices(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] bool? isPinned = null,
        [FromQuery] string? search = null)
    {
        var query = _context.Notices
            .AsNoTracking()
            .Include(n => n.CreatedBy)
            .Include(n => n.Attachments)
            .Where(n => n.IsActive)
            .AsQueryable();
        
        if (isPinned.HasValue)
        {
            query = query.Where(n => n.IsPinned == isPinned.Value);
        }
        
        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(n => n.Title.Contains(search) || n.Content.Contains(search));
        }
        
        // 고정글 먼저, 그 다음 최신순
        query = query.OrderByDescending(n => n.IsPinned).ThenByDescending(n => n.CreatedAt);
        
        var totalCount = await query.CountAsync();
        
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NoticeListDto
            {
                NoticeId = n.NoticeId,
                Title = n.Title,
                IsPinned = n.IsPinned,
                ViewCount = n.ViewCount,
                CreatedByName = n.CreatedBy.Name,
                CreatedAt = n.CreatedAt,
                AttachmentCount = n.Attachments.Count
            })
            .ToListAsync();
        
        return Ok(new PagedResult<NoticeListDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }
    
    // GET: api/notices/recent - 최근 공지사항 조회 (대시보드용)
    [HttpGet("recent")]
    [Authorize]
    // GetRecentNotices 액션 - 최근 등록된 공지사항 상위 N개를 조회해 대시보드/메인 화면에서 보여줍니다.
    public async Task<ActionResult<List<NoticeListDto>>> GetRecentNotices([FromQuery] int count = 3)
    {
        var notices = await _context.Notices
            .AsNoTracking()
            .Include(n => n.CreatedBy)
            .Where(n => n.IsActive)
            .OrderByDescending(n => n.IsPinned)
            .ThenByDescending(n => n.CreatedAt)
            .Take(count)
            .Select(n => new NoticeListDto
            {
                NoticeId = n.NoticeId,
                Title = n.Title,
                IsPinned = n.IsPinned,
                ViewCount = n.ViewCount,
                CreatedByName = n.CreatedBy.Name,
                CreatedAt = n.CreatedAt,
                AttachmentCount = n.Attachments.Count
            })
            .ToListAsync();
        
        return Ok(notices);
    }
    
    // GET: api/notices/{id} - 공지사항 상세 조회
    [HttpGet("{id}")]
    [Authorize]
    // GetNotice 액션 - 단일 공지사항 상세 내용을 조회하고, 필요 시 조회 수와 조회 이력을 갱신합니다.
    public async Task<ActionResult<NoticeDto>> GetNotice(int id)
    {
        var notice = await _context.Notices
            .Include(n => n.CreatedBy)
            .Include(n => n.Attachments)
            .FirstOrDefaultAsync(n => n.NoticeId == id);
        
        if (notice == null)
            return NotFound(new { message = "공지사항을 찾을 수 없습니다." });
        
        // 비활성 공지는 관리자만 볼 수 있음
        if (!notice.IsActive && !IsInternalUser())
            return NotFound(new { message = "공지사항을 찾을 수 없습니다." });
        
        // 조회수 증가 - 사용자별로 한 번만 증가
        var userId = GetCurrentUserId();
        var increaseViewCount = false;

        if (userId > 0)
        {
            var alreadyViewed = await _context.NoticeViews
                .AnyAsync(v => v.NoticeId == notice.NoticeId && v.UserId == userId);

            if (!alreadyViewed)
            {
                increaseViewCount = true;

                _context.NoticeViews.Add(new NoticeView
                {
                    NoticeId = notice.NoticeId,
                    UserId = userId,
                    ViewedAt = DateTime.Now
                });
            }
        }
        else
        {
            // 로그인 정보가 없는 경우(예외 상황)는 요청마다 한 번씩만 증가
            increaseViewCount = true;
        }

        if (increaseViewCount)
        {
            notice.ViewCount++;
            await _context.SaveChangesAsync();
        }
        
        return Ok(new NoticeDto
        {
            NoticeId = notice.NoticeId,
            Title = notice.Title,
            Content = notice.Content,
            IsPinned = notice.IsPinned,
            IsActive = notice.IsActive,
            ViewCount = notice.ViewCount,
            CreatedBy = new UserSimpleDto
            {
                UserId = notice.CreatedBy.UserId,
                Name = notice.CreatedBy.Name,
                Email = notice.CreatedBy.Email
            },
            CreatedAt = notice.CreatedAt,
            UpdatedAt = notice.UpdatedAt,
            Attachments = notice.Attachments.Select(a => new NoticeAttachmentDto
            {
                AttachmentId = a.AttachmentId,
                FileName = a.FileName,
                FileSize = a.FileSize,
                ContentType = a.ContentType,
                CreatedAt = a.CreatedAt
            }).ToList()
        });
    }
    
    // POST: api/notices - 공지사항 생성 (관리자만)
    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.AdminOrManager)]
    // CreateNotice 액션 - 관리자가 신규 공지사항을 등록하고, 기본 메타데이터(작성자, 고정 여부 등)를 저장합니다.
    public async Task<ActionResult<NoticeDto>> CreateNotice([FromBody] CreateNoticeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "제목을 입력해주세요." });
        
        if (string.IsNullOrWhiteSpace(request.Content))
            return BadRequest(new { message = "내용을 입력해주세요." });
        
        var userId = GetCurrentUserId();
        
        var notice = new Notice
        {
            Title = request.Title,
            Content = request.Content,
            IsPinned = request.IsPinned,
            IsActive = request.IsActive,
            CreatedByUserId = userId,
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now
        };
        
        _context.Notices.Add(notice);
        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(userId, "NOTICE", notice.NoticeId, "CREATE", null, $"Title: {notice.Title}");
        
        // Reload with navigation properties
        await _context.Entry(notice).Reference(n => n.CreatedBy).LoadAsync();
        
        return Created("", new NoticeDto
        {
            NoticeId = notice.NoticeId,
            Title = notice.Title,
            Content = notice.Content,
            IsPinned = notice.IsPinned,
            IsActive = notice.IsActive,
            ViewCount = notice.ViewCount,
            CreatedBy = new UserSimpleDto
            {
                UserId = notice.CreatedBy.UserId,
                Name = notice.CreatedBy.Name,
                Email = notice.CreatedBy.Email
            },
            CreatedAt = notice.CreatedAt,
            UpdatedAt = notice.UpdatedAt,
            Attachments = new List<NoticeAttachmentDto>()
        });
    }
    
    // PUT: api/notices/{id} - 공지사항 수정 (관리자만)
    [HttpPut("{id}")]
    [Authorize(Policy = AuthorizationPolicies.AdminOrManager)]
    // UpdateNotice 액션 - 공지 제목, 내용, 고정 여부, 사용 여부 등을 수정합니다.
    public async Task<ActionResult<NoticeDto>> UpdateNotice(int id, [FromBody] UpdateNoticeRequest request)
    {
        var notice = await _context.Notices
            .Include(n => n.CreatedBy)
            .Include(n => n.Attachments)
            .FirstOrDefaultAsync(n => n.NoticeId == id);
        
        if (notice == null)
            return NotFound(new { message = "공지사항을 찾을 수 없습니다." });
        
        if (request.Title != null)
            notice.Title = request.Title;
        
        if (request.Content != null)
            notice.Content = request.Content;
        
        if (request.IsPinned.HasValue)
            notice.IsPinned = request.IsPinned.Value;
        
        if (request.IsActive.HasValue)
            notice.IsActive = request.IsActive.Value;
        
        notice.UpdatedAt = DateTime.Now;
        
        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "NOTICE", notice.NoticeId, "UPDATE", null, $"Title: {notice.Title}");
        
        return Ok(new NoticeDto
        {
            NoticeId = notice.NoticeId,
            Title = notice.Title,
            Content = notice.Content,
            IsPinned = notice.IsPinned,
            IsActive = notice.IsActive,
            ViewCount = notice.ViewCount,
            CreatedBy = new UserSimpleDto
            {
                UserId = notice.CreatedBy.UserId,
                Name = notice.CreatedBy.Name,
                Email = notice.CreatedBy.Email
            },
            CreatedAt = notice.CreatedAt,
            UpdatedAt = notice.UpdatedAt,
            Attachments = notice.Attachments.Select(a => new NoticeAttachmentDto
            {
                AttachmentId = a.AttachmentId,
                FileName = a.FileName,
                FileSize = a.FileSize,
                ContentType = a.ContentType,
                CreatedAt = a.CreatedAt
            }).ToList()
        });
    }
    
    // DELETE: api/notices/{id} - 공지사항 삭제 (관리자만)
    [HttpDelete("{id}")]
    [Authorize(Policy = AuthorizationPolicies.AdminOrManager)]
    // DeleteNotice 액션 - 공지사항과 연결된 첨부파일 정보를 함께 정리하며 공지 항목을 삭제합니다.
    public async Task<IActionResult> DeleteNotice(int id)
    {
        var notice = await _context.Notices
            .Include(n => n.Attachments)
            .FirstOrDefaultAsync(n => n.NoticeId == id);
        
        if (notice == null)
            return NotFound(new { message = "공지사항을 찾을 수 없습니다." });
        
        // 첨부파일 삭제
        foreach (var attachment in notice.Attachments)
        {
            var normalizedPath = attachment.StoredPath.Replace("/", Path.DirectorySeparatorChar.ToString());
            var filePath = Path.Combine(_environment.ContentRootPath, normalizedPath);
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
            }
        }
        
        _context.Notices.Remove(notice);
        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "NOTICE", id, "DELETE", null, $"Title: {notice.Title}");
        
        return NoContent();
    }
    
    // POST: api/notices/{id}/attachments - 첨부파일 업로드 (관리자만)
    [HttpPost("{id}/attachments")]
    [Authorize(Policy = AuthorizationPolicies.AdminOrManager)]
    // UploadAttachment 액션 - 공지사항에 연결된 첨부파일을 업로드하고 메타데이터와 저장 경로를 기록합니다.
    public async Task<ActionResult<NoticeAttachmentDto>> UploadAttachment(int id, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "파일이 없습니다." });
        
        var notice = await _context.Notices.FindAsync(id);
        if (notice == null)
            return NotFound(new { message = "공지사항을 찾을 수 없습니다." });
        
        // Get configuration
        var maxFileSizeMB = _configuration.GetValue<int>("FileStorage:MaxFileSizeMB", 10);
        var allowedExtensions = _configuration.GetSection("FileStorage:AllowedExtensions").Get<string[]>() 
            ?? new[] { ".png", ".jpg", ".jpeg", ".gif", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".zip" };
        
        // Validate file size
        if (file.Length > maxFileSizeMB * 1024 * 1024)
            return BadRequest(new { message = $"파일 크기는 {maxFileSizeMB}MB를 초과할 수 없습니다." });
        
        // Validate file extension
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension))
            return BadRequest(new { message = "허용되지 않는 파일 형식입니다." });
        
        // Create date-based upload directory: notices/yyyy/MM/dd
        var uploadPath = _configuration["FileStorage:UploadPath"] ?? "uploads";
        
        var basePath = Path.IsPathRooted(uploadPath) 
            ? uploadPath 
            : Path.Combine(_environment.ContentRootPath, uploadPath);
            
        var now = DateTime.Now;
        var datePath = Path.Combine("notices", now.Year.ToString(), now.Month.ToString("D2"), now.Day.ToString("D2"));
        var fullUploadPath = Path.Combine(basePath, datePath);
        Directory.CreateDirectory(fullUploadPath);
        
        // Generate unique filename
        var timestamp = now.ToString("HHmmss");
        var uniqueFileName = $"{timestamp}_{id}_{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(fullUploadPath, uniqueFileName);
        
        // Save file
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }
        
        // Create attachment record
        var storedRelativePath = Path.Combine(datePath, uniqueFileName).Replace("\\", "/");
        
        var attachment = new NoticeAttachment
        {
            NoticeId = id,
            FileName = file.FileName,
            StoredPath = storedRelativePath,
            FileSize = file.Length,
            ContentType = file.ContentType,
            CreatedAt = DateTime.Now
        };
        
        _context.NoticeAttachments.Add(attachment);
        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "NOTICE_ATTACHMENT", attachment.AttachmentId, "CREATE", null, $"FileName: {file.FileName}");
        
        return Created("", new NoticeAttachmentDto
        {
            AttachmentId = attachment.AttachmentId,
            FileName = attachment.FileName,
            FileSize = attachment.FileSize,
            ContentType = attachment.ContentType,
            CreatedAt = attachment.CreatedAt
        });
    }
    
    // GET: api/notices/{noticeId}/attachments/{attachmentId}/download - 첨부파일 다운로드
    [HttpGet("{noticeId}/attachments/{attachmentId}/download")]
    [Authorize]
    // DownloadAttachment 액션 - 공지사항 첨부파일을 원래 파일명으로 다운로드할 수 있도록 반환합니다.
    public async Task<IActionResult> DownloadAttachment(int noticeId, int attachmentId)
    {
        var attachment = await _context.NoticeAttachments
            .Include(a => a.Notice)
            .FirstOrDefaultAsync(a => a.AttachmentId == attachmentId && a.NoticeId == noticeId);
        
        if (attachment == null)
            return NotFound();
        
        // 비활성 공지의 첨부파일은 관리자만 다운로드 가능
        if (!attachment.Notice.IsActive && !IsInternalUser())
            return NotFound();
        
        var normalizedPath = attachment.StoredPath.Replace("/", Path.DirectorySeparatorChar.ToString());
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
        
        if (!System.IO.File.Exists(filePath))
            return NotFound(new { message = "파일을 찾을 수 없습니다." });
        
        return PhysicalFile(filePath, attachment.ContentType ?? "application/octet-stream", attachment.FileName, enableRangeProcessing: true);
    }
    
    // DELETE: api/notices/{noticeId}/attachments/{attachmentId} - 첨부파일 삭제 (관리자만)
    [HttpDelete("{noticeId}/attachments/{attachmentId}")]
    [Authorize(Policy = AuthorizationPolicies.AdminOrManager)]
    // DeleteAttachment 액션 - 공지사항 첨부파일 레코드와 실제 파일을 모두 삭제합니다.
    public async Task<IActionResult> DeleteAttachment(int noticeId, int attachmentId)
    {
        var attachment = await _context.NoticeAttachments
            .FirstOrDefaultAsync(a => a.AttachmentId == attachmentId && a.NoticeId == noticeId);
        
        if (attachment == null)
            return NotFound();
        
        // Delete file
        var normalizedPath = attachment.StoredPath.Replace("/", Path.DirectorySeparatorChar.ToString());
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
        
        _context.NoticeAttachments.Remove(attachment);
        await _context.SaveChangesAsync();
        
        await _auditLogService.LogActionAsync(GetCurrentUserId(), "NOTICE_ATTACHMENT", attachmentId, "DELETE", null, $"NoticeId: {noticeId}");
        
        return NoContent();
    }
    
    // GET: api/notices/admin - 관리자용 전체 목록 (비활성 포함)
    [HttpGet("admin")]
    [Authorize(Policy = AuthorizationPolicies.AdminOrManager)]
    // GetAllNoticesAdmin 액션 - 관리자 화면에서 사용하는 공지사항 목록을 검색/필터/페이징 조건으로 조회합니다.
    public async Task<ActionResult<PagedResult<NoticeListDto>>> GetAllNoticesAdmin(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null)
    {
        var query = _context.Notices
            .Include(n => n.CreatedBy)
            .Include(n => n.Attachments)
            .AsQueryable();
        
        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(n => n.Title.Contains(search) || n.Content.Contains(search));
        }
        
        query = query.OrderByDescending(n => n.IsPinned).ThenByDescending(n => n.CreatedAt);
        
        var totalCount = await query.CountAsync();
        
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NoticeListDto
            {
                NoticeId = n.NoticeId,
                Title = n.Title,
                IsPinned = n.IsPinned,
                ViewCount = n.ViewCount,
                CreatedByName = n.CreatedBy.Name,
                CreatedAt = n.CreatedAt,
                AttachmentCount = n.Attachments.Count
            })
            .ToListAsync();
        
        // IsActive 정보 추가를 위한 별도 조회
        var noticeIds = items.Select(i => i.NoticeId).ToList();
        var activeStatus = await _context.Notices
            .Where(n => noticeIds.Contains(n.NoticeId))
            .Select(n => new { n.NoticeId, n.IsActive })
            .ToDictionaryAsync(n => n.NoticeId, n => n.IsActive);
        
        return Ok(new 
        {
            Items = items.Select(i => new 
            {
                i.NoticeId,
                i.Title,
                i.IsPinned,
                IsActive = activeStatus.GetValueOrDefault(i.NoticeId, true),
                i.ViewCount,
                i.CreatedByName,
                i.CreatedAt,
                i.AttachmentCount
            }),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        });
    }
}