// ============================================================================
// 파일명: ErpSystem.cs
// 경로: Backend/Models/ErpSystem.cs
// 설명: ERP 시스템(ErpSystem) 엔티티 모델 - 고객사별 ERP 시스템 정보
// ----------------------------------------------------------------------------
// [관련 테이블] ErpSystem
// [관계]
//   - Company (N:1) - 사용 회사
//   - Request (1:N) - 관련 요청들
// [유지보수 가이드]
//   - 요청 등록 시 관련 ERP 시스템 선택 가능
//   - 회사별로 여러 ERP 시스템 등록 가능
// ============================================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BnfErpPortal.Models;

/// <summary>
/// ERP 시스템(ErpSystem) 엔티티
/// </summary>
/// <remarks>
/// <para>고객사별로 사용 중인 ERP 시스템 정보를 관리</para>
/// <para>요청 등록 시 관련 ERP 시스템을 선택하여 문제 범위를 명확히 함</para>
/// </remarks>
[Table("ErpSystem")]
public class ErpSystem
{
    #region 기본 키
    
    /// <summary>ERP 시스템 고유 ID (PK, Auto Increment)</summary>
    [Key]
    public int ErpSystemId { get; set; }
    
    #endregion

    #region 외래 키
    
    /// <summary>사용 회사 ID (FK → Company.CompanyId)</summary>
    [Required]
    public int CompanyId { get; set; }
    
    #endregion

    #region 시스템 정보
    
    /// <summary>ERP 시스템명 (예: 인사관리, 회계관리)</summary>
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    /// <summary>버전 정보 (예: v2.5.1)</summary>
    [MaxLength(50)]
    public string? Version { get; set; }
    
    /// <summary>서버 정보 (IP, 호스트명 등)</summary>
    [MaxLength(255)]
    public string? ServerInfo { get; set; }
    
    /// <summary>시스템 설명</summary>
    [MaxLength(500)]
    public string? Description { get; set; }
    
    /// <summary>활성화 여부</summary>
    public bool IsActive { get; set; } = true;
    
    #endregion

    #region Navigation Properties (관계 탐색)
    
    /// <summary>사용 회사 정보</summary>
    [ForeignKey("CompanyId")]
    public virtual Company Company { get; set; } = null!;
    
    /// <summary>이 ERP 시스템 관련 요청 목록</summary>
    public virtual ICollection<Request> Requests { get; set; } = new List<Request>();
    
    #endregion
}
