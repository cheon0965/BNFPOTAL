// ============================================================================
// 파일명: RequestConstants.cs
// 경로: Backend/Constants/RequestConstants.cs
// 설명: 유지보수 요청(Request)의 상태, 우선순위, 카테고리 상수 정의
// ----------------------------------------------------------------------------
// [유지보수 가이드]
// 1. 새 상태/우선순위/카테고리 추가 시:
//    - 상수 추가 → 배열에 추가 → Labels 딕셔너리에 한글명 추가
//    - Frontend의 constants/index.js도 동일하게 수정할 것
// 2. 값 변경 시 DB 데이터 마이그레이션 필요
// 3. 상태 워크플로우 변경 시 OrderedStatuses 순서 조정
// ============================================================================

namespace BnfErpPortal.Constants;

/// <summary>
/// 요청 상태(Status) 상수 및 워크플로우 정의
/// </summary>
/// <remarks>
/// <para>상태 흐름 (워크플로우):</para>
/// <code>
/// SUBMITTED → ASSIGNED → IN_PROGRESS → INTERIM_REPLIED → COMPLETED
///    (전달)    (배정됨)     (처리중)      (중간답변)        (완료)
/// </code>
/// <para>상태 전환 규칙:</para>
/// <list type="bullet">
///   <item><description>SUBMITTED: 고객이 요청 등록 시 초기 상태</description></item>
///   <item><description>ASSIGNED: 담당자 배정 시 자동 전환</description></item>
///   <item><description>IN_PROGRESS: 담당자가 수동으로 변경</description></item>
///   <item><description>INTERIM_REPLIED: 내부 사용자가 외부 답변 작성 시 자동 전환</description></item>
///   <item><description>COMPLETED: 처리 완료 시 (ClosedAt 자동 기록)</description></item>
/// </list>
/// </remarks>
public static class RequestStatus
{
    #region 상태 상수 정의
    
    /// <summary>전달 - 요청이 등록된 초기 상태</summary>
    public const string Submitted = "SUBMITTED";
    
    /// <summary>담당자 배정 - 엔지니어가 배정된 상태</summary>
    public const string Assigned = "ASSIGNED";
    
    /// <summary>처리중 - 담당자가 요청을 검토/처리 중</summary>
    public const string InProgress = "IN_PROGRESS";
    
    /// <summary>중간답변완료 - 고객에게 중간 답변을 전달한 상태</summary>
    public const string InterimReplied = "INTERIM_REPLIED";
    
    /// <summary>완료 - 요청 처리가 완료된 최종 상태</summary>
    public const string Completed = "COMPLETED";
    
    #endregion

    #region 상태 관련 배열 및 딕셔너리
    
    /// <summary>
    /// 상태 워크플로우 순서 배열
    /// </summary>
    /// <remarks>대시보드 통계, 상태 진행률 표시 등에 사용</remarks>
    public static readonly string[] OrderedStatuses = 
    {
        Submitted, Assigned, InProgress, InterimReplied, Completed
    };
    
    /// <summary>
    /// 상태별 한글 레이블 (UI 표시용)
    /// </summary>
    /// <remarks>알림 메시지, 이메일 본문 생성 시 사용</remarks>
    public static readonly Dictionary<string, string> Labels = new()
    {
        { Submitted, "전달" },
        { Assigned, "담당자 배정" },
        { InProgress, "처리중" },
        { InterimReplied, "중간답변완료" },
        { Completed, "완료" }
    };
    
    #endregion

    #region 유효성 검사 메서드
    
    /// <summary>
    /// 유효한 상태 값인지 확인
    /// </summary>
    /// <param name="status">확인할 상태 문자열</param>
    /// <returns>유효하면 true</returns>
    public static bool IsValid(string status) => 
        Array.Exists(OrderedStatuses, s => s == status);
    
    #endregion
}

/// <summary>
/// 요청 우선순위(Priority) 상수 정의
/// </summary>
/// <remarks>
/// <para>우선순위 체계 (낮음 → 높음):</para>
/// <list type="number">
///   <item><description>LOW (낮음): 일반적인 문의, 여유 있는 처리</description></item>
///   <item><description>MEDIUM (보통): 기본 우선순위, 일반 요청</description></item>
///   <item><description>HIGH (높음): 업무 영향이 있는 중요 요청</description></item>
///   <item><description>CRITICAL (긴급): 즉시 처리 필요, 내부 알림 발송</description></item>
/// </list>
/// <para>⚠️ CRITICAL 우선순위 요청 시 비앤에프소프트 전 직원에게 알림 발송</para>
/// </remarks>
public static class RequestPriority
{
    #region 우선순위 상수 정의
    
    /// <summary>낮음 - 여유 있게 처리 가능한 요청</summary>
    public const string Low = "LOW";
    
    /// <summary>보통 - 일반적인 요청 (기본값)</summary>
    public const string Medium = "MEDIUM";
    
    /// <summary>높음 - 업무에 영향을 주는 중요 요청</summary>
    public const string High = "HIGH";
    
    /// <summary>긴급 - 즉시 처리 필요 (내부 전체 알림 발송)</summary>
    public const string Critical = "CRITICAL";
    
    #endregion

    #region 우선순위 관련 배열 및 딕셔너리
    
    /// <summary>모든 우선순위 배열 (낮음 → 높음 순서)</summary>
    public static readonly string[] AllPriorities = { Low, Medium, High, Critical };
    
    /// <summary>우선순위별 한글 레이블 (UI 표시용)</summary>
    public static readonly Dictionary<string, string> Labels = new()
    {
        { Low, "낮음" },
        { Medium, "보통" },
        { High, "높음" },
        { Critical, "긴급" }
    };
    
    #endregion

    #region 유효성 검사 메서드
    
    /// <summary>
    /// 유효한 우선순위 값인지 확인
    /// </summary>
    /// <param name="priority">확인할 우선순위 문자열</param>
    /// <returns>유효하면 true</returns>
    public static bool IsValid(string priority) => 
        Array.Exists(AllPriorities, p => p == priority);
    
    #endregion
}

/// <summary>
/// 요청 카테고리(Category) 상수 정의
/// </summary>
/// <remarks>
/// <para>카테고리 분류:</para>
/// <list type="bullet">
///   <item><description>BUG: 시스템 오류, 버그 리포트</description></item>
///   <item><description>QUESTION: 사용법 문의, 기능 질문</description></item>
///   <item><description>IMPROVEMENT: 기능 개선 요청, 신규 기능 제안</description></item>
/// </list>
/// </remarks>
public static class RequestCategory
{
    #region 카테고리 상수 정의
    
    /// <summary>버그 - 시스템 오류, 예상과 다른 동작</summary>
    public const string Bug = "BUG";
    
    /// <summary>문의 - 사용법, 기능 관련 질문</summary>
    public const string Question = "QUESTION";
    
    /// <summary>개선요청 - 기능 개선, 신규 기능 제안</summary>
    public const string Improvement = "IMPROVEMENT";
    
    #endregion

    #region 카테고리 관련 배열 및 딕셔너리
    
    /// <summary>모든 카테고리 배열</summary>
    public static readonly string[] AllCategories = { Bug, Question, Improvement };
    
    /// <summary>카테고리별 한글 레이블 (UI 표시용)</summary>
    public static readonly Dictionary<string, string> Labels = new()
    {
        { Bug, "버그" },
        { Question, "문의" },
        { Improvement, "개선요청" }
    };
    
    #endregion

    #region 유효성 검사 메서드
    
    /// <summary>
    /// 유효한 카테고리 값인지 확인
    /// </summary>
    /// <param name="category">확인할 카테고리 문자열</param>
    /// <returns>유효하면 true</returns>
    public static bool IsValid(string category) => 
        Array.Exists(AllCategories, c => c == category);
    
    #endregion
}