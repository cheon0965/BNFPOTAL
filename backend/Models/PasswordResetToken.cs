// ============================================================================
// 파일명: PasswordResetToken.cs
// 경로: Backend/Models/PasswordResetToken.cs
// 설명: 비밀번호 재설정 토큰 엔티티 모델
// ----------------------------------------------------------------------------
// [관련 테이블] PasswordResetToken
// [관계]
//   - User (N:1) - 토큰 대상 사용자
// [유지보수 가이드]
//   - 토큰 유효 시간: 24시간 (UsersController.ResetPassword에서 설정)
//   - 사용자당 1개의 활성 토큰만 유지 (새 토큰 생성 시 기존 토큰 무효화)
// ============================================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BnfErpPortal.Models;

/// <summary>
/// 비밀번호 재설정 토큰 엔티티
/// </summary>
[Table("PasswordResetToken")]
public class PasswordResetToken
{
    /// <summary>토큰 고유 ID (PK, Auto Increment)</summary>
    [Key]
    public int PasswordResetTokenId { get; set; }

    /// <summary>대상 사용자 ID (FK → User.UserId)</summary>
    public int UserId { get; set; }

    /// <summary>보안 토큰 (GUID)</summary>
    [Required]
    [MaxLength(100)]
    public string Token { get; set; } = string.Empty;

    /// <summary>토큰 만료 일시</summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>사용 여부</summary>
    public bool IsUsed { get; set; } = false;

    /// <summary>사용 일시</summary>
    public DateTime? UsedAt { get; set; }

    /// <summary>생성 일시</summary>
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    #region Navigation Properties

    /// <summary>대상 사용자</summary>
    [ForeignKey("UserId")]
    public virtual User? User { get; set; }

    #endregion
}
