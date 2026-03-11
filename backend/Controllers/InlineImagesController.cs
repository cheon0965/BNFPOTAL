using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Webp;

namespace BnfErpPortal.Controllers;

[ApiController]
[Route("api/attachments/inline")]
[Authorize]
public class InlineImagesController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;

    public InlineImagesController(IConfiguration configuration, IWebHostEnvironment environment)
    {
        _configuration = configuration;
        _environment = environment;
    }

    [HttpPost]
    public async Task<IActionResult> UploadInlineImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "파일이 없습니다." });

        if (!file.ContentType.StartsWith("image/"))
            return BadRequest(new { message = "이미지 파일만 업로드 가능합니다." });

        var maxFileSizeMB = _configuration.GetValue<int>("FileStorage:MaxFileSizeMB", 10);
        if (file.Length > maxFileSizeMB * 1024 * 1024)
            return BadRequest(new { message = $"파일 크기는 {maxFileSizeMB}MB를 초과할 수 없습니다." });

        try
        {
            var uploadPath = _configuration["FileStorage:UploadPath"] ?? "uploads";
            var basePath = Path.IsPathRooted(uploadPath) 
                ? uploadPath 
                : Path.Combine(_environment.ContentRootPath, uploadPath);
            
            var inlineImagesPath = Path.Combine(basePath, "inline-images");
            if (!Directory.Exists(inlineImagesPath))
            {
                Directory.CreateDirectory(inlineImagesPath);
            }

            var uniqueFileName = $"{Guid.NewGuid():N}.webp";
            var filePath = Path.Combine(inlineImagesPath, uniqueFileName);

            using (var stream = file.OpenReadStream())
            {
                using var image = await Image.LoadAsync(stream);
                
                // Max width 1200px (RAM 및 스토리지 부하 최소화)
                if (image.Width > 1200)
                {
                    var ratio = 1200.0 / image.Width;
                    var newHeight = (int)(image.Height * ratio);
                    image.Mutate(x => x.Resize(1200, newHeight));
                }

                await image.SaveAsWebpAsync(filePath, new WebpEncoder { Quality = 80 });
            }

            var url = $"/inline-images/{uniqueFileName}";
            return Ok(new { url });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "이미지 처리 중 오류가 발생했습니다.", details = ex.Message });
        }
    }
}
