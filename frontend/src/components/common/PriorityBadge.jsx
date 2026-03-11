import { PRIORITY_LABELS, PRIORITY_STYLES } from '../../constants'

/**
 * 우선순위 배지 컴포넌트
 * @param {Object} props
 * @param {string} props.priority - 우선순위 코드 (LOW, MEDIUM, HIGH, CRITICAL)
 * @param {string} [props.className] - 추가 CSS 클래스
 */
export default function PriorityBadge({ priority, className = '' }) {
    const label = PRIORITY_LABELS[priority] || priority
    const style = PRIORITY_STYLES[priority] || 'bg-gray-100 text-gray-600'

    return (
        <span className={`badge ${style} ${className}`}>
            {label}
        </span>
    )
}
