/**
 * ============================================================================
 * 파일명: utils/format.js
 * 경로: Frontend/src/utils/format.js
 * 설명: 포맷팅 유틸리티 함수 모음
 * ----------------------------------------------------------------------------
 * [주요 함수]
 *   - formatRelativeDate: 상대 시간 (방금 전, 3시간 전)
 *   - formatDateTime: 전체 날짜 시간 (2024년 1월 15일 14:30)
 *   - formatDate: 짧은 날짜 (2024.01.15)
 *   - formatFileSize: 파일 크기 (1.5 MB)
 *   - formatNumber: 숫자 천단위 콤마 (1,234,567)
 *   - truncateText: 텍스트 말줄임 처리
 *   - stripHtml: HTML 태그 제거 및 순수 텍스트 추출 (게시글 미리보기용)
 *
 * [사용 방법]
 *   import { formatDateTime, formatFileSize } from '@/utils/format'
 *   const dateStr = formatDateTime(createdAt)
 *
 * [유지보수 가이드]
 *   - 한국어 로케일(ko-KR) 기준으로 포맷팅
 *   - 새 포맷 함수 추가 시 이 파일에 작성
 * ============================================================================
 */


/**
 * 상대적 날짜 표시 (예: 방금 전, 3시간 전, 2일 전)
 * @param {string|Date} dateString - 날짜 문자열 또는 Date 객체
 * @returns {string} 포맷된 상대 날짜
 */
export function formatRelativeDate(dateString) {
    if (!dateString) return ''

    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) return '방금 전'
    if (diffMinutes < 60) return `${diffMinutes}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays < 7) return `${diffDays}일 전`

    return date.toLocaleDateString('ko-KR')
}

/**
 * 전체 날짜 시간 포맷 (예: 2024년 1월 15일 14:30)
 * @param {string|Date} dateString - 날짜 문자열 또는 Date 객체
 * @returns {string} 포맷된 날짜 시간
 */
export function formatDateTime(dateString) {
    if (!dateString) return ''

    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

/**
 * 짧은 날짜 포맷 (예: 2024.01.15)
 * @param {string|Date} dateString - 날짜 문자열 또는 Date 객체
 * @returns {string} 포맷된 날짜
 */
export function formatDate(dateString) {
    if (!dateString) return ''

    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR')
}

/**
 * 파일 크기 포맷 (예: 1.5 MB)
 * @param {number} bytes - 바이트 크기
 * @returns {string} 포맷된 파일 크기
 */
export function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B'

    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const k = 1024
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`
}

/**
 * 숫자에 천 단위 콤마 추가 (예: 1,234,567)
 * @param {number} num - 숫자
 * @returns {string} 포맷된 숫자
 */
export function formatNumber(num) {
    if (num === null || num === undefined) return '0'
    return num.toLocaleString('ko-KR')
}



/**
 * 텍스트 말줄임 처리
 * @param {string} text - 원본 텍스트
 * @param {number} maxLength - 최대 길이
 * @returns {string} 말줄임 처리된 텍스트
 */
export function truncateText(text, maxLength = 100) {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
}

/**
 * HTML 태그를 제거하고 순수 텍스트만 추출합니다.
 * @param {string} html - HTML 문자열
 * @returns {string} 순수 텍스트
 */
export function stripHtml(html) {
    if (!html) return '';
    // 줄바꿈 등의 특수 처리
    const decoded = html.replace(/<br\s*[\/]?>/gi, " ")
        .replace(/&nbsp;/gi, " ");

    // 정규식을 사용하여 HTML 태그 제거
    return decoded.replace(/<[^>]*>?/gm, '').trim();
}
