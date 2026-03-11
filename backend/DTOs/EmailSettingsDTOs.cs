using System.ComponentModel.DataAnnotations;

namespace BnfErpPortal.DTOs;

public class EmailSettingsDto
{
    public int EmailSettingsId { get; set; }
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string User { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromAddress { get; set; } = string.Empty;
    public bool EnableSsl { get; set; } = true;
}

public class UpdateEmailSettingsRequest
{
    [Required]
    public string Host { get; set; } = string.Empty;

    [Required]
    public int Port { get; set; } = 587;

    [Required]
    public string User { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    public string FromAddress { get; set; } = string.Empty;

    public bool EnableSsl { get; set; } = true;
}
