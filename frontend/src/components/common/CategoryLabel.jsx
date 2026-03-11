import { CATEGORY_LABELS } from '../../constants'

/**
 * 카테고리 라벨 컴포넌트
 * @param {Object} props
 * @param {string} props.category - 카테고리 코드 (BUG, QUESTION, IMPROVEMENT)
 * @param {string} [props.className] - 추가 CSS 클래스
 */
export default function CategoryLabel({ category, className = '' }) {
    const label = CATEGORY_LABELS[category] || category

    return (
        <span className={`text-xs text-bnf-gray ${className}`}>
            {label}
        </span>
    )
}
