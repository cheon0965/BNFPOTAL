using System.ComponentModel.DataAnnotations;

namespace BnfErpPortal.DTOs;

public class LoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string Password { get; set; } = string.Empty;
}

public class RegisterRequest
{
    [Required]
    public string RegistrationCode { get; set; } = string.Empty;
    
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string? PhoneNumber { get; set; }
    
    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;
}

public class AuthResponse
{
    public UserDto User { get; set; } = null!;
    public string Token { get; set; } = string.Empty;
}

public class UserDto
{
    public int UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string Role { get; set; } = string.Empty;
    public int? CompanyId { get; set; }
    public string? CompanyName { get; set; }
}

public class ValidateCodeRequest
{
    public string Code { get; set; } = string.Empty;
}

public class ValidateCodeResponse
{
    public bool IsValid { get; set; }
    public string? CompanyName { get; set; }
    public string? Message { get; set; }
}

public class UpdateProfileRequest
{
    public string? Name { get; set; }
    
    [EmailAddress]
    public string? Email { get; set; }
    
    [MaxLength(50)]
    public string? PhoneNumber { get; set; }
}

public class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;
    
    [Required]
    [MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;
}
