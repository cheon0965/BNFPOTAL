/**
 * 빈 상태 컴포넌트
 * 데이터가 없을 때 표시하는 UI
 */
export default function EmptyState({
    icon: Icon,
    title,
    description,
    action
}) {
    return (
        <div className="p-12 text-center">
            {Icon && <Icon className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-700" />}
            <h3 className="text-lg font-medium text-bnf-dark mb-2 dark:text-gray-100">{title}</h3>
            {description && <p className="text-bnf-gray mb-6 dark:text-gray-400">{description}</p>}
            {action}
        </div>
    )
}
