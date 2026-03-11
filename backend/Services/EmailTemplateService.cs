// ============================================================================
// 파일명: EmailTemplateService.cs
// 경로: Backend/Services/EmailTemplateService.cs
// 설명: 이메일 템플릿 렌더링 서비스 - 동적 변수 치환
// ----------------------------------------------------------------------------
// [지원 변수]
//   {UserName} - 수신자 이름
//   {RequestTitle} - 요청 제목
//   {OldStatus} / {NewStatus} - 이전/새 상태 (한글)
//   {Reason} - 변경 사유
//   {RequestLink} - 요청 상세 페이지 링크 (자동으로 <a> 태그 변환)
// [유지보수 가이드]
//   - 새 변수 추가 시 RenderAsync() 호출부에서 data 딕셔너리에 추가
//   - HTML 메일이므로 줄바꿈은 <br />로 변환됨
// ============================================================================

using BnfErpPortal.Data;
using BnfErpPortal.Models;
using Microsoft.EntityFrameworkCore;

namespace BnfErpPortal.Services;

public interface IEmailTemplateService
{
    Task<(string subject, string body)> RenderAsync(string templateKey, Dictionary<string, string> data);
}

public class EmailTemplateService : IEmailTemplateService
{
    private const string AlwaysEnabledTemplateKey = "USER_PASSWORD_RESET";

    private readonly ApplicationDbContext _context;

    public EmailTemplateService(ApplicationDbContext context)
    {
        _context = context;
    }

    
    public async Task<(string subject, string body)> RenderAsync(string templateKey, Dictionary<string, string> data)
    {
        var template = await _context.EmailTemplates
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.TemplateKey == templateKey);

        var isAlwaysEnabledTemplate = string.Equals(templateKey, AlwaysEnabledTemplateKey, StringComparison.OrdinalIgnoreCase);

        if (template == null || (!template.IsEnabled && !isAlwaysEnabledTemplate))
        {
            return (string.Empty, string.Empty);
        }

        // 제목은 기존과 동일하게 토큰만 치환
        string subject = ReplaceTokens(template.SubjectTemplate, data);

        // 본문은 RequestLink, ResetLink를 HTML 링크로 변환하고, 줄바꿈을 <br />로 치환하여 HTML 메일에 맞게 렌더링
        var bodyData = new Dictionary<string, string>(data ?? new Dictionary<string, string>());

        if (bodyData.TryGetValue("RequestLink", out var requestLink) && !string.IsNullOrWhiteSpace(requestLink))
        {
            var requestLinkHtml = $"<a href=\"{requestLink}\" target=\"_blank\" style=\"display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;\">요청 상세보기</a>";
            bodyData["RequestLink"] = requestLinkHtml;
        }

        if (bodyData.TryGetValue("TaskLink", out var taskLink) && !string.IsNullOrWhiteSpace(taskLink))
        {
            var taskLinkHtml = $"<a href=\"{taskLink}\" target=\"_blank\" style=\"display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;\">업무 상세보기</a>";
            bodyData["TaskLink"] = taskLinkHtml;
        }

        if (bodyData.TryGetValue("ResetLink", out var resetLink) && !string.IsNullOrWhiteSpace(resetLink))
        {
            var resetLinkHtml = $"<a href=\"{resetLink}\" target=\"_blank\" style=\"display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;\">비밀번호 재설정하기</a>";
            bodyData["ResetLink"] = resetLinkHtml;
        }

        string body = ReplaceTokens(template.BodyTemplate, bodyData);

        // 텍스트 템플릿의 줄바꿈을 HTML 줄바꿈으로 변환
        body = body
            .Replace("\r\n", "\n")
            .Replace("\n", "<br />");

        return (subject, body);
    }

    // ReplaceTokens 메서드 - 처리를 수행합니다.
    private static string ReplaceTokens(string template, Dictionary<string, string> data)
    {
        if (string.IsNullOrEmpty(template))
            return template;

        foreach (var kv in data)
        {
            template = template.Replace("{" + kv.Key + "}", kv.Value ?? string.Empty);
        }

        return template;
    }
}
