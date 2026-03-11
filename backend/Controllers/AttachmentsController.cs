using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using BnfErpPortal.Data;
using BnfErpPortal.DTOs;
using BnfErpPortal.Models;

namespace BnfErpPortal.Controllers;

[ApiController]
[Route("api/requests/{requestId}/attachments")]
[Authorize]
public class AttachmentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    
    public AttachmentsController(
        ApplicationDbContext context, 
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        _context = context;
        _configuration = configuration;
        _environment = environment;
    }
    
    // GetCurrentCompanyId 액션 - 데이터를 조회합니다.
    private int? GetCurrentCompanyId()
    {
        var companyIdStr = User.FindFirstValue("CompanyId");
        return string.IsNullOrEmpty(companyIdStr) ? null : int.Parse(companyIdStr);
    }
    
    // GetCurrentRole 액션 - 데이터를 조회합니다.
    private string GetCurrentRole() => User.FindFirstValue(ClaimTypes.Role) ?? "";
    // IsInternalUser 액션 - 처리를 수행합니다.
    private bool IsInternalUser() => new[] { "ADMIN", "MANAGER", "ENGINEER" }.Contains(GetCurrentRole());
    
    [HttpGet]
    // GetAttachments 액션 - 특정 요청 또는 댓글에 연결된 첨부파일 목록을 조회합니다.
    public async Task<ActionResult<List<AttachmentDto>>> GetAttachments(int requestId)
    {
        var request = await _context.Requests.FindAsync(requestId);
        if (request == null)
            return NotFound();
        
        // Check access
        if (!IsInternalUser() && request.CompanyId != GetCurrentCompanyId())
            return Forbid();
        
        // Get only request-level attachments (CommentId is null)
        var attachments = await _context.Attachments
            .Where(a => a.RequestId == requestId && a.CommentId == null)
            .Select(a => new AttachmentDto
            {
                AttachmentId = a.AttachmentId,
                CommentId = a.CommentId,
                FileName = a.FileName,
                FileSize = a.FileSize,
                ContentType = a.ContentType,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();
        
        return Ok(attachments);
    }
    
    [HttpPost]
    // UploadAttachment 액션 - 요청 본문에 대한 첨부파일을 업로드하고 메타데이터를 저장합니다.
    public async Task<ActionResult<AttachmentDto>> UploadAttachment(int requestId, IFormFile file)
    {
        return await UploadAttachmentInternal(requestId, null, file);
    }
    
    // Upload attachment to a specific comment
    [HttpPost("comment/{commentId}")]
    // UploadCommentAttachment 액션 - 댓글에 연결된 첨부파일을 업로드하고 메타데이터를 저장합니다.
    public async Task<ActionResult<AttachmentDto>> UploadCommentAttachment(int requestId, int commentId, IFormFile file)
    {
        // Verify comment exists and belongs to this request
        var comment = await _context.RequestComments.FindAsync(commentId);
        if (comment == null || comment.RequestId != requestId)
            return NotFound(new { message = "댓글을 찾을 수 없습니다." });
        
        return await UploadAttachmentInternal(requestId, commentId, file);
    }
    
    // UploadAttachmentInternal 액션 - 파일을 업로드합니다.
    private async Task<ActionResult<AttachmentDto>> UploadAttachmentInternal(int requestId, int? commentId, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "파일이 없습니다." });
        
        var request = await _context.Requests.FindAsync(requestId);
        if (request == null)
            return NotFound();
        
        // Check access
        if (!IsInternalUser() && request.CompanyId != GetCurrentCompanyId())
            return Forbid();
        
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
        
        // Create date-based upload directory: yyyy/MM/dd
        var uploadPath = _configuration["FileStorage:UploadPath"] ?? "uploads";
        
        // Handle absolute or relative UploadPath
        var basePath = Path.IsPathRooted(uploadPath) 
            ? uploadPath 
            : Path.Combine(_environment.ContentRootPath, uploadPath);
            
        var now = DateTime.Now;
        var datePath = Path.Combine(now.Year.ToString(), now.Month.ToString("D2"), now.Day.ToString("D2"));
        var fullUploadPath = Path.Combine(basePath, datePath);
        Directory.CreateDirectory(fullUploadPath);
        
        // Generate unique filename: timestamp_requestId_guid.extension
        var timestamp = now.ToString("HHmmss");
        var uniqueFileName = $"{timestamp}_{requestId}_{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(fullUploadPath, uniqueFileName);
        
        // Save file
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }
        
        // Create attachment record - store RELATIVE path only (datePath/filename)
        var storedRelativePath = Path.Combine(datePath, uniqueFileName).Replace("\\", "/");
        
        var attachment = new Attachment
        {
            RequestId = requestId,
            CommentId = commentId,
            FileName = file.FileName,
            StoredPath = storedRelativePath,
            FileSize = file.Length,
            ContentType = file.ContentType,
            CreatedAt = DateTime.Now
        };
        
        _context.Attachments.Add(attachment);
        await _context.SaveChangesAsync();
        
        return Created("", new AttachmentDto
        {
            AttachmentId = attachment.AttachmentId,
            CommentId = attachment.CommentId,
            FileName = attachment.FileName,
            FileSize = attachment.FileSize,
            ContentType = attachment.ContentType,
            CreatedAt = attachment.CreatedAt
        });
    }
    
    [HttpGet("{attachmentId}/download")]
    // DownloadAttachment 액션 - 요청/댓글 첨부파일을 다운로드할 수 있도록 파일 스트림을 반환합니다.
    public async Task<IActionResult> DownloadAttachment(int requestId, int attachmentId)
    {
        var attachment = await _context.Attachments
            .Include(a => a.Request)
            .FirstOrDefaultAsync(a => a.AttachmentId == attachmentId && a.RequestId == requestId);
        
        if (attachment == null)
            return NotFound();
        
        // Check access
        if (!IsInternalUser() && attachment.Request.CompanyId != GetCurrentCompanyId())
            return Forbid();
        
        // Handle both forward slashes and backslashes in stored path
        var normalizedPath = attachment.StoredPath.Replace("/", Path.DirectorySeparatorChar.ToString());
        string filePath;
        
        // Legacy support: old files include 'uploads/' or are absolute
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
    
    [HttpDelete("{attachmentId}")]
    // DeleteAttachment 액션 - 첨부파일 레코드와 실제 파일을 모두 삭제합니다.
    public async Task<IActionResult> DeleteAttachment(int requestId, int attachmentId)
    {
        var attachment = await _context.Attachments
            .Include(a => a.Request)
            .FirstOrDefaultAsync(a => a.AttachmentId == attachmentId && a.RequestId == requestId);
        
        if (attachment == null)
            return NotFound();
        
        // Check access - only request creator or internal users can delete
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
        if (!IsInternalUser() && attachment.Request.CreatedByUserId != userId)
            return Forbid();
        
        // Delete file - handle both forward slashes and backslashes
        var normalizedPath = attachment.StoredPath.Replace("/", Path.DirectorySeparatorChar.ToString());
        string filePath;
        
        // Legacy support
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
        
        _context.Attachments.Remove(attachment);
        await _context.SaveChangesAsync();
        
        return NoContent();
    }
}