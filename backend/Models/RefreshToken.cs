// ============================================================================
// 파일명: RefreshToken.cs
// 경로: Backend/Models/RefreshToken.cs
// 설명: 리프레시 토큰(RefreshToken) 엔티티 - JWT 토큰 갱신용
// ----------------------------------------------------------------------------
// [관련 테이블] RefreshToken
// [관계] User (N:1) - 토큰 소유자
// [유지보수 가이드]
//   - 토큰 만료/폐기 시 새 토큰 발급
//   - 보안을 위해 주기적으로 만료된 토큰 정리 권장
// ============================================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BnfErpPortal.Models;

/// <summary>
/// 리프레시 토큰(RefreshToken) 엔티티
/// </summary>
/// <remarks>
/// <para>JWT Access Token 갱신을 위한 리프레시 토큰 관리</para>
/// <para>Access Token보다 긴 유효기간을 가짐</para>
/// </remarks>
[Table("RefreshToken")]
public class RefreshToken
{
    #region 기본 키
    
    /// <summary>토큰 고유 ID (PK)</summary>
    [Key]
    public int RefreshTokenId { get; set; }
    
    #endregion

    #region 외래 키
    
    /// <summary>토큰 소유자 ID (FK → User.UserId)</summary>
    [Required]
    public int UserId { get; set; }
    
    #endregion

    #region 토큰 정보
    
    /// <summary>토큰 값 (랜덤 문자열)</summary>
    [Required]
    [MaxLength(500)]
    public string Token { get; set; } = string.Empty;
    
    /// <summary>토큰 만료 일시</summary>
    [Required]
    public DateTime ExpiresAt { get; set; }
    
    /// <summary>토큰 생성 일시</summary>
    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    #endregion

    #region 폐기 정보
    
    /// <summary>폐기 여부 (로그아웃, 강제 만료 시)</summary>
    public bool IsRevoked { get; set; } = false;
    
    /// <summary>폐기 일시</summary>
    public DateTime? RevokedAt { get; set; }
    
    /// <summary>폐기 사유</summary>
    [MaxLength(200)]
    public string? RevokeReason { get; set; }
    
    #endregion

    #region 보안 정보
    
    /// <summary>토큰 생성 시 클라이언트 IP</summary>
    [MaxLength(50)]
    public string? CreatedByIp { get; set; }
    
    #endregion

    #region Navigation Properties
    
    /// <summary>토큰 소유자 정보</summary>
    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;
    
    #endregion

    #region 계산 속성
    
    /// <summary>
    /// 토큰 활성 상태 여부
    /// </summary>
    /// <remarks>폐기되지 않고 만료되지 않은 경우 true</remarks>
    public bool IsActive => !IsRevoked && DateTime.Now < ExpiresAt;
    
    #endregion
}
