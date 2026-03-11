import { STATUS_LABELS, STATUS_STYLES } from '../../constants'

/**
 * 요청 상태 배지 컴포넌트
 * @param {Object} props
 * @param {string} props.status - 상태 코드 (SUBMITTED, ASSIGNED, etc.)
 * @param {string} [props.className] - 추가 CSS 클래스
 */
export default function StatusBadge({ status, className = '' }) {
    const label = STATUS_LABELS[status] || status
    const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'

    return (
        <span className={`badge ${style} ${className}`}>
            {label}
        </span>
    )
}
