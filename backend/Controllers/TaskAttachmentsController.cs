using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using BnfErpPortal.Data;
using BnfErpPortal.DTOs;
using BnfErpPortal.Models;

namespace BnfErpPortal.Controllers;

[ApiController]
[Route("api/tasks/{taskId}/attachments")]
[Authorize]
public class TaskAttachmentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;

    public TaskAttachmentsController(
        ApplicationDbContext context,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        _context = context;
        _configuration = configuration;
        _environment = environment;
    }

    private int GetCurrentUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

    private string GetCurrentRole() =>
        User.FindFirstValue(ClaimTypes.Role) ?? "";

    private bool IsInternalUser() =>
        new[] { "ADMIN", "MANAGER", "ENGINEER" }.Contains(GetCurrentRole());

    /// <summary>업무 레벨 첨부파일 목록 조회</summary>
    [HttpGet]
    public async Task<ActionResult<List<TaskAttachmentDto>>> GetAttachments(int taskId)
    {
        var task = await _context.InternalTasks.FindAsync(taskId);
        if (task == null) return NotFound();

        if (!IsInternalUser()) return Forbid();

        var attachments = await _context.TaskAttachments
            .Where(a => a.TaskId == taskId && a.TaskCommentId == null)
            .Select(a => new TaskAttachmentDto
            {
                TaskAttachmentId = a.TaskAttachmentId,
                TaskCommentId = a.TaskCommentId,
                FileName = a.FileName,
                FileSize = a.FileSize,
                ContentType = a.ContentType,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();

        return Ok(attachments);
    }

    /// <summary>업무에 파일 업로드</summary>
    [HttpPost]
    public async Task<ActionResult<TaskAttachmentDto>> UploadAttachment(int taskId, IFormFile file)
    {
        return await UploadInternal(taskId, null, file);
    }

    /// <summary>코멘트에 파일 업로드</summary>
    [HttpPost("comment/{commentId}")]
    public async Task<ActionResult<TaskAttachmentDto>> UploadCommentAttachment(int taskId, int commentId, IFormFile file)
    {
        var comment = await _context.TaskComments.FindAsync(commentId);
        if (comment == null || comment.TaskId != taskId)
            return NotFound(new { message = "코멘트를 찾을 수 없습니다." });

        return await UploadInternal(taskId, commentId, file);
    }

    /// <summary>파일 다운로드</summary>
    [HttpGet("{attachmentId}/download")]
    public async Task<IActionResult> DownloadAttachment(int taskId, int attachmentId)
    {
        var attachment = await _context.TaskAttachments
            .FirstOrDefaultAsync(a => a.TaskAttachmentId == attachmentId && a.TaskId == taskId);

        if (attachment == null) return NotFound();
        if (!IsInternalUser()) return Forbid();

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

    /// <summary>첨부파일 삭제</summary>
    [HttpDelete("{attachmentId}")]
    public async Task<IActionResult> DeleteAttachment(int taskId, int attachmentId)
    {
        var attachment = await _context.TaskAttachments
            .FirstOrDefaultAsync(a => a.TaskAttachmentId == attachmentId && a.TaskId == taskId);

        if (attachment == null) return NotFound();
        if (!IsInternalUser()) return Forbid();

        // 물리 파일 삭제
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

        _context.TaskAttachments.Remove(attachment);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>공통 파일 업로드 처리</summary>
    private async Task<ActionResult<TaskAttachmentDto>> UploadInternal(int taskId, int? commentId, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "파일이 없습니다." });

        var task = await _context.InternalTasks.FindAsync(taskId);
        if (task == null) return NotFound();

        if (!IsInternalUser()) return Forbid();

        // File validation
        var maxFileSizeMB = _configuration.GetValue<int>("FileStorage:MaxFileSizeMB", 10);
        var allowedExtensions = _configuration.GetSection("FileStorage:AllowedExtensions").Get<string[]>()
            ?? new[] { ".png", ".jpg", ".jpeg", ".gif", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".zip" };

        if (file.Length > maxFileSizeMB * 1024 * 1024)
            return BadRequest(new { message = $"파일 크기는 {maxFileSizeMB}MB를 초과할 수 없습니다." });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension))
            return BadRequest(new { message = "허용되지 않는 파일 형식입니다." });

        // Save file
        var uploadPath = _configuration["FileStorage:UploadPath"] ?? "uploads";
        
        var basePath = Path.IsPathRooted(uploadPath) 
            ? uploadPath 
            : Path.Combine(_environment.ContentRootPath, uploadPath);
            
        var now = DateTime.Now;
        var datePath = Path.Combine(now.Year.ToString(), now.Month.ToString("D2"), now.Day.ToString("D2"));
        var fullUploadPath = Path.Combine(basePath, datePath);
        Directory.CreateDirectory(fullUploadPath);

        var timestamp = now.ToString("HHmmss");
        var uniqueFileName = $"{timestamp}_task{taskId}_{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(fullUploadPath, uniqueFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var storedRelativePath = Path.Combine(datePath, uniqueFileName).Replace("\\", "/");

        var attachment = new TaskAttachment
        {
            TaskId = taskId,
            TaskCommentId = commentId,
            FileName = file.FileName,
            StoredPath = storedRelativePath,
            FileSize = file.Length,
            ContentType = file.ContentType,
            CreatedAt = DateTime.Now
        };

        _context.TaskAttachments.Add(attachment);
        await _context.SaveChangesAsync();

        return Created("", new TaskAttachmentDto
        {
            TaskAttachmentId = attachment.TaskAttachmentId,
            TaskCommentId = attachment.TaskCommentId,
            FileName = attachment.FileName,
            FileSize = attachment.FileSize,
            ContentType = attachment.ContentType,
            CreatedAt = attachment.CreatedAt
        });
    }
}
