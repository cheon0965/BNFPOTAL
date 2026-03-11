/**
 * ============================================================================
 * 파일명: constants/index.js
 * 경로: Frontend/src/constants/index.js
 * 설명: 프로젝트 전역 상수 정의 - 상태, 우선순위, 역할 등
 * ----------------------------------------------------------------------------
 * [중요] 백엔드의 Constants 폴더와 값 동기화 필수!
 *   - REQUEST_STATUS ↔ RequestStatus (RequestConstants.cs)
 *   - PRIORITY ↔ RequestPriority (RequestConstants.cs)
 *   - CATEGORY ↔ RequestCategory (RequestConstants.cs)
 *   - USER_ROLES ↔ UserRoles (UserRoles.cs)
 *
 * [구성]
 *   - REQUEST_STATUS: 요청 상태 코드
 *   - STATUS_LABELS: 상태 한글 레이블
 *   - STATUS_STYLES: 상태별 Tailwind CSS 클래스
 *   - STATUS_OPTIONS: Select 컴포넌트용 옵션 배열
 *   (우선순위, 카테고리, 역할도 동일 패턴)
 *
 * [사용 방법]
 *   import { REQUEST_STATUS, STATUS_LABELS } from '@/constants'
 *   const label = STATUS_LABELS[REQUEST_STATUS.SUBMITTED]  // '전달'
 *
 * [유지보수 가이드]
 *   - 새 상태/우선순위 추가 시:
 *     1. 상수 추가 (예: REQUEST_STATUS.NEW_STATUS)
 *     2. LABELS에 한글명 추가
 *     3. STYLES에 CSS 클래스 추가
 *     4. OPTIONS 배열에 추가
 *     5. 백엔드 Constants도 동일하게 수정
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// 요청 상태 (Request Status)
// 워크플로우: SUBMITTED → ASSIGNED → IN_PROGRESS → INTERIM_REPLIED → COMPLETED
// ─────────────────────────────────────────────────────────────────────────────
export const REQUEST_STATUS = {
  SUBMITTED: 'SUBMITTED',           // 전달 - 새 요청 등록됨
  ASSIGNED: 'ASSIGNED',             // 담당자 배정 - 엔지니어 배정됨
  IN_PROGRESS: 'IN_PROGRESS',       // 처리중 - 작업 진행 중
  INTERIM_REPLIED: 'INTERIM_REPLIED', // 중간답변완료 - 고객에게 답변함
  COMPLETED: 'COMPLETED'            // 완료 - 처리 종료
}

/** 상태 한글 레이블 */
export const STATUS_LABELS = {
  [REQUEST_STATUS.SUBMITTED]: '전달',
  [REQUEST_STATUS.ASSIGNED]: '담당자 배정',
  [REQUEST_STATUS.IN_PROGRESS]: '처리중',
  [REQUEST_STATUS.INTERIM_REPLIED]: '중간답변완료',
  [REQUEST_STATUS.COMPLETED]: '완료'
}

/** 상태별 Tailwind CSS 클래스 (배지 스타일) */
export const STATUS_STYLES = {
  [REQUEST_STATUS.SUBMITTED]: 'badge-blue',
  [REQUEST_STATUS.ASSIGNED]: 'bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
  [REQUEST_STATUS.IN_PROGRESS]: 'badge-orange',
  [REQUEST_STATUS.INTERIM_REPLIED]: 'bg-teal-50 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300',
  [REQUEST_STATUS.COMPLETED]: 'badge-green'
}

/** Select 컴포넌트용 상태 옵션 */
export const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: REQUEST_STATUS.SUBMITTED, label: STATUS_LABELS[REQUEST_STATUS.SUBMITTED] },
  { value: REQUEST_STATUS.ASSIGNED, label: STATUS_LABELS[REQUEST_STATUS.ASSIGNED] },
  { value: REQUEST_STATUS.IN_PROGRESS, label: STATUS_LABELS[REQUEST_STATUS.IN_PROGRESS] },
  { value: REQUEST_STATUS.INTERIM_REPLIED, label: STATUS_LABELS[REQUEST_STATUS.INTERIM_REPLIED] },
  { value: REQUEST_STATUS.COMPLETED, label: STATUS_LABELS[REQUEST_STATUS.COMPLETED] }
]

// ─────────────────────────────────────────────────────────────────────────────
// 우선순위 (Priority)
// LOW < MEDIUM < HIGH < CRITICAL
// CRITICAL 선택 시 내부 전체 알림 발송됨
// ─────────────────────────────────────────────────────────────────────────────
export const PRIORITY = {
  LOW: 'LOW',           // 낮음 - 여유 있게 처리
  MEDIUM: 'MEDIUM',     // 보통 - 일반 요청 (기본값)
  HIGH: 'HIGH',         // 높음 - 중요 요청
  CRITICAL: 'CRITICAL'  // 긴급 - 즉시 처리 필요 (전체 알림)
}

/** 우선순위 한글 레이블 */
export const PRIORITY_LABELS = {
  [PRIORITY.LOW]: '낮음',
  [PRIORITY.MEDIUM]: '보통',
  [PRIORITY.HIGH]: '높음',
  [PRIORITY.CRITICAL]: '긴급'
}

/** 우선순위별 Tailwind CSS 클래스 */
export const PRIORITY_STYLES = {
  [PRIORITY.LOW]: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  [PRIORITY.MEDIUM]: 'bg-blue-50 text-bnf-blue dark:bg-blue-900/40 dark:text-blue-300',
  [PRIORITY.HIGH]: 'bg-orange-50 text-bnf-orange dark:bg-orange-900/40 dark:text-orange-300',
  [PRIORITY.CRITICAL]: 'bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-300'
}

/** Select 컴포넌트용 우선순위 옵션 (높은 순서부터) */
export const PRIORITY_OPTIONS = [
  { value: '', label: '전체 우선순위' },
  { value: PRIORITY.CRITICAL, label: PRIORITY_LABELS[PRIORITY.CRITICAL] },
  { value: PRIORITY.HIGH, label: PRIORITY_LABELS[PRIORITY.HIGH] },
  { value: PRIORITY.MEDIUM, label: PRIORITY_LABELS[PRIORITY.MEDIUM] },
  { value: PRIORITY.LOW, label: PRIORITY_LABELS[PRIORITY.LOW] }
]

// ─────────────────────────────────────────────────────────────────────────────
// 카테고리 (Category)
// 요청 유형 분류
// ─────────────────────────────────────────────────────────────────────────────
export const CATEGORY = {
  BUG: 'BUG',               // 버그 - 시스템 오류
  QUESTION: 'QUESTION',     // 문의 - 사용법, 기능 질문
  IMPROVEMENT: 'IMPROVEMENT' // 개선요청 - 기능 개선/추가 제안
}

/** 카테고리 한글 레이블 (이모지 포함) */
export const CATEGORY_LABELS = {
  [CATEGORY.BUG]: '🐛 버그',
  [CATEGORY.QUESTION]: '❓ 문의',
  [CATEGORY.IMPROVEMENT]: '✨ 개선요청'
}

/** Select 컴포넌트용 카테고리 옵션 */
export const CATEGORY_OPTIONS = [
  { value: CATEGORY.QUESTION, label: '문의' },
  { value: CATEGORY.BUG, label: '버그' },
  { value: CATEGORY.IMPROVEMENT, label: '개선요청' }
]

/** 필터용 카테고리 옵션 (전체 포함) */
export const CATEGORY_FILTER_OPTIONS = [
  { value: '', label: '전체 유형' },
  { value: CATEGORY.QUESTION, label: '❓ 문의' },
  { value: CATEGORY.BUG, label: '🐛 버그' },
  { value: CATEGORY.IMPROVEMENT, label: '✨ 개선요청' }
]

// ─────────────────────────────────────────────────────────────────────────────
// 사용자 역할 (User Roles)
// 백엔드 UserRoles.cs와 동기화 필수
// ─────────────────────────────────────────────────────────────────────────────
export const USER_ROLES = {
  ADMIN: 'ADMIN',       // 시스템 관리자 - 모든 권한
  MANAGER: 'MANAGER',   // 매니저 - 관리 기능
  ENGINEER: 'ENGINEER', // 엔지니어 - 요청 처리
  CUSTOMER: 'CUSTOMER'  // 고객 - 요청 등록/조회
}

/** 역할 한글 레이블 */
export const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: '시스템 관리자',
  [USER_ROLES.MANAGER]: '매니저',
  [USER_ROLES.ENGINEER]: '엔지니어',
  [USER_ROLES.CUSTOMER]: '고객'
}

/** 내부 사용자 역할 배열 (비앤에프소프트 직원) */
export const INTERNAL_ROLES = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ENGINEER]

/** 고객 역할 배열 */
export const CUSTOMER_ROLES = [USER_ROLES.CUSTOMER]

/** 비앤에프소프트 회사 코드 (backend BnfCompany.CompanyCode와 동일) */
export const BNF_COMPANY_CODE = 'BNFSOFT'

// ─────────────────────────────────────────────────────────────────────────────
// 페이지네이션 설정
// ─────────────────────────────────────────────────────────────────────────────
export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]
export const DEFAULT_PAGE_SIZE = 10
