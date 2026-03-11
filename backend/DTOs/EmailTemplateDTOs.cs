using System.ComponentModel.DataAnnotations;

namespace BnfErpPortal.DTOs;

public class EmailTemplateDto
{
    public int EmailTemplateId { get; set; }
    public string TemplateKey { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string SubjectTemplate { get; set; } = string.Empty;
    public string BodyTemplate { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
}

public class UpdateEmailTemplateRequest
{
    [Required]
    public string SubjectTemplate { get; set; } = string.Empty;

    [Required]
    public string BodyTemplate { get; set; } = string.Empty;

    public bool IsEnabled { get; set; } = true;
}
