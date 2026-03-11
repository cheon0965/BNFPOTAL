using System.ComponentModel.DataAnnotations;

namespace BnfErpPortal.DTOs;

public class CompanyDto
{
    public int CompanyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public bool IsActive { get; set; }
    public int UsersCount { get; set; }
    public int RequestsCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateCompanyRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string? PhoneNumber { get; set; }
    
    public bool IsActive { get; set; } = true;
}

public class UpdateCompanyRequest
{
    [MaxLength(200)]
    public string? Name { get; set; }
    
    [MaxLength(50)]
    public string? Code { get; set; }
    
    [MaxLength(50)]
    public string? PhoneNumber { get; set; }
    
    public bool? IsActive { get; set; }
}

public class RegistrationCodeDto
{
    public int RegistrationCodeId { get; set; }
    public int CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? MaxUses { get; set; }
    public int UsedCount { get; set; }
    public string RoleDefault { get; set; } = string.Empty;
    public DateTime? ExpiresAt { get; set; }
    public bool UserIsActiveDefault { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateRegistrationCodeRequest
{
    [Required]
    public int CompanyId { get; set; }
    
    [MaxLength(255)]
    public string? Description { get; set; }
    
    public int? MaxUses { get; set; }
    
    [Required]
    public string RoleDefault { get; set; } = "CUSTOMER";
    
    public DateTime? ExpiresAt { get; set; }
    
    public bool UserIsActiveDefault { get; set; } = true;
}

public class ErpSystemDto
{
    public int ErpSystemId { get; set; }
    public int CompanyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Version { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; }
}

public class RecentActivityDto
{
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
}

public class DashboardStatsDto
{
    public RequestStatsDto Requests { get; set; } = new();
    public int TotalCompanies { get; set; }
    public int TotalUsers { get; set; }
    public int MyIncompleteTasks { get; set; }
    public string AvgResponseTime { get; set; } = string.Empty;
    public List<RecentActivityDto> RecentActivities { get; set; } = new();
}

public class UserListDto
{
    public int UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string Role { get; set; } = string.Empty;
    public int? CompanyId { get; set; }
    public string? CompanyName { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
}

public class UpdateUserRequest
{
    [MaxLength(100)]
    public string? Name { get; set; }
    
    [MaxLength(50)]
    public string? PhoneNumber { get; set; }
    
    [MaxLength(50)]
    public string? Role { get; set; }
    
    public bool? IsActive { get; set; }
}
