// ============================================================================
// 파일명: RequestDTOs.cs
// 경로: Backend/DTOs/RequestDTOs.cs
// 설명: 유지보수 요청 관련 DTO 정의 - API 요청/응답 객체
// ----------------------------------------------------------------------------
// [포함 DTO]
//   - RequestDto: 요청 상세 응답
//   - CreateRequestRequest: 요청 생성 요청
//   - UpdateRequestRequest: 요청 수정 요청
//   - UpdateRequestStatusRequest: 상태 변경 요청
//   - UpdateRequestAssigneeRequest: 담당자 배정 요청
//   - RequestCommentDto: 댓글 응답
//   - CreateCommentRequest: 댓글 생성 요청
//   - AttachmentDto: 첨부파일 응답
//   - RequestStatsDto: 요청 통계 응답
//
// [유지보수 가이드]
//   - 필드 추가 시 해당 Controller의 매핑 로직도 수정
//   - Category/Status/Priority 값은 Constants 참조
// ============================================================================

using System.ComponentModel.DataAnnotations;

namespace BnfErpPortal.DTOs;

#region 요청(Request) DTO

/// <summary>
/// 요청 상세 응답 DTO
/// </summary>
/// <remarks>GET /api/requests/{id} 응답</remarks>
public class RequestDto
{
    public int RequestId { get; set; }
    public int CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? CompanyPhoneNumber { get; set; }
    public int? ErpSystemId { get; set; }
    public string? ErpSystemName { get; set; }
    public string? ErpSystemVersion { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public UserDto CreatedBy { get; set; } = null!;
    public UserDto? AssignedTo { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public int CommentsCount { get; set; }
    public List<AttachmentDto> Attachments { get; set; } = new();
}

/// <summary>
/// 요청 생성 요청 DTO
/// </summary>
/// <remarks>POST /api/requests 요청 본문</remarks>
public class CreateRequestRequest
{
    /// <summary>요청 제목</summary>
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;
    
    /// <summary>요청 내용</summary>
    [Required]
    public string Content { get; set; } = string.Empty;
    
    /// <summary>카테고리 (BUG, QUESTION, IMPROVEMENT)</summary>
    [Required]
    public string Category { get; set; } = "QUESTION";
    
    /// <summary>우선순위 (LOW, MEDIUM, HIGH, CRITICAL)</summary>
    [Required]
    public string Priority { get; set; } = "MEDIUM";
    
    /// <summary>관련 ERP 시스템 ID (선택)</summary>
    public int? ErpSystemId { get; set; }
}

/// <summary>
/// 요청 수정 요청 DTO
/// </summary>
/// <remarks>PUT /api/requests/{id} 요청 본문</remarks>
public class UpdateRequestRequest
{
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    public string Content { get; set; } = string.Empty;
    
    [Required]
    public string Category { get; set; } = "QUESTION";
    
    [Required]
    public string Priority { get; set; } = "MEDIUM";
    
    public int? ErpSystemId { get; set; }
}

/// <summary>
/// 상태 변경 요청 DTO
/// </summary>
/// <remarks>PATCH /api/requests/{id}/status 요청 본문</remarks>
public class UpdateRequestStatusRequest
{
    /// <summary>변경할 상태 값</summary>
    [Required]
    public string Status { get; set; } = string.Empty;
}

/// <summary>
/// 담당자 배정 요청 DTO
/// </summary>
/// <remarks>PATCH /api/requests/{id}/assignee 요청 본문</remarks>
public class UpdateRequestAssigneeRequest
{
    /// <summary>담당자 ID (null이면 배정 해제)</summary>
    public int? UserId { get; set; }
}

#endregion

#region 댓글(Comment) DTO

/// <summary>
/// 댓글 응답 DTO
/// </summary>
public class RequestCommentDto
{
    public int CommentId { get; set; }
    public int RequestId { get; set; }
    public UserDto User { get; set; } = null!;
    public string Content { get; set; } = string.Empty;
    /// <summary>내부 댓글 여부 (true: 고객 비공개)</summary>
    public bool IsInternal { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<AttachmentDto> Attachments { get; set; } = new();
}

/// <summary>
/// 댓글 생성 요청 DTO
/// </summary>
public class CreateCommentRequest
{
    [Required]
    public string Content { get; set; } = string.Empty;
    
    /// <summary>내부 댓글 여부 (기본: 공개)</summary>
    public bool IsInternal { get; set; } = false;
}

/// <summary>
/// 댓글 수정 요청 DTO
/// </summary>
public class UpdateCommentRequest
{
    [Required]
    public string Content { get; set; } = string.Empty;
}

#endregion

#region 첨부파일/통계 DTO

/// <summary>
/// 첨부파일 응답 DTO
/// </summary>
public class AttachmentDto
{
    public int AttachmentId { get; set; }
    /// <summary>소속 댓글 ID (null이면 요청 레벨 첨부)</summary>
    public int? CommentId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string? ContentType { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// 요청 통계 응답 DTO
/// </summary>
/// <remarks>대시보드 통계 표시용</remarks>
public class RequestStatsDto
{
    public int Total { get; set; }
    public int Submitted { get; set; }       // 전달
    public int Assigned { get; set; }        // 담당자 배정
    public int InProgress { get; set; }      // 처리중
    public int InterimReplied { get; set; }  // 중간답변완료
    public int Completed { get; set; }       // 완료
}

#endregion
