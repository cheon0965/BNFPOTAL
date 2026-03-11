import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * 페이지네이션 컴포넌트
 * @param {Object} props
 * @param {number} props.currentPage - 현재 페이지 (1부터 시작)
 * @param {number} props.totalPages - 총 페이지 수
 * @param {number} props.totalCount - 총 항목 수
 * @param {number} props.pageSize - 페이지당 항목 수
 * @param {Function} props.onPageChange - 페이지 변경 콜백
 * @param {Function} props.onPageSizeChange - 페이지 크기 변경 콜백
 * @param {number[]} [props.pageSizeOptions] - 페이지 크기 옵션 배열
 * @param {'light' | 'dark'} [props.variant] - 테마 variant
 */
export default function Pagination({
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [5, 10, 50],
    variant = 'light'
}) {
    if (totalCount === 0) return null

    const startItem = (currentPage - 1) * pageSize + 1
    const endItem = Math.min(currentPage * pageSize, totalCount)

    // 표시할 페이지 번호 계산
    const getPageNumbers = () => {
        return Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
    }

    return (
        <div className="px-5 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
                <span className="text-sm text-bnf-gray dark:text-gray-400">
                    {startItem}-{endItem} / {totalCount}개
                </span>
                {pageSizeOptions.length > 1 && (
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        className="text-sm rounded-lg border focus:outline-none focus:ring-2 border-gray-200 focus:ring-bnf-blue focus:border-bnf-blue dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-bnf-orange/50 dark:focus:border-bnf-orange/50"
                    >
                        {pageSizeOptions.map(size => (
                            <option key={size} value={size}>{size}개씩 보기</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="flex items-center gap-2">
                <button
                    className="p-2 rounded-lg transition-colors disabled:opacity-50 hover:bg-gray-100 text-gray-600 disabled:hover:bg-transparent dark:hover:bg-gray-700 dark:text-gray-400 dark:disabled:hover:bg-transparent"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1">
                    {getPageNumbers().map((p, i, arr) => (
                        <div key={p} className="flex items-center">
                            {i > 0 && arr[i - 1] !== p - 1 && (
                                <span className="px-2 text-gray-400 dark:text-gray-500">...</span>
                            )}
                            <button
                                onClick={() => onPageChange(p)}
                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === p
                                        ? 'bg-bnf-blue text-white dark:bg-bnf-orange dark:text-white'
                                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {p}
                            </button>
                        </div>
                    ))}
                </div>

                <button
                    className="p-2 rounded-lg transition-colors disabled:opacity-50 hover:bg-gray-100 text-gray-600 disabled:hover:bg-transparent dark:hover:bg-gray-700 dark:text-gray-400 dark:disabled:hover:bg-transparent"
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    )
}
