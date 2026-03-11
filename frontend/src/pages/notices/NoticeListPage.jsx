import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { noticesApi } from '../../api'
import { Pagination } from '../../components/common'
import { formatDateTime } from '../../utils'
import {
  Megaphone,
  Pin,
  Eye,
  Paperclip,
  Search,
  ChevronRight
} from 'lucide-react'

export default function NoticeListPage() {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // 1. 페이지 변경 시에는 즉시 호출
  useEffect(() => {
    fetchNotices()
  }, [currentPage, pageSize])

  // 2. 검색어 변경 시에만 300ms 디바운스 적용
  useEffect(() => {
    const timer = setTimeout(() => {
      // 페이지가 1이 아닐 때는 위에서 useEffect([searchQuery])로 setCurrentPage(1)이
      // 호출되어 currentPage 트리거가 발동하므로 중복 호출 방지를 위해 조건 처리
      if (currentPage === 1) {
        fetchNotices()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchNotices = async () => {
    try {
      setLoading(true)
      const params = {
        page: currentPage,
        pageSize,
        search: searchQuery || undefined
      }
      const response = await noticesApi.getAll(params)
      const data = response.data
      setNotices(data.items || [])
      setTotalCount(data.totalCount || 0)
      setTotalPages(data.totalPages || 0)
    } catch (error) {
      console.error('공지사항 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (size) => {
    setPageSize(size)
    setCurrentPage(1)
  }

  if (loading && notices.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-bnf-blue border-t-transparent rounded-full mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-bnf-orange/10 flex items-center justify-center">
          <Megaphone className="w-5 h-5 text-bnf-orange" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-bnf-dark dark:text-white tracking-tight">
            공지사항
          </h1>
          <p className="text-sm text-bnf-gray dark:text-gray-400 mt-1">
            비앤에프소프트의 공지사항을 확인하세요.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bnf-gray dark:text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
          />
        </div>
      </div>

      {/* Notice List */}
      <div className="card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 relative min-h-[300px]">
        {loading && notices.length > 0 && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-bnf-blue border-t-transparent rounded-full"></div>
          </div>
        )}

        {notices.length === 0 ? (
          <div className="p-12 text-center text-bnf-gray dark:text-gray-500">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30 dark:opacity-40" />
            <p>등록된 공지사항이 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {notices.map((notice) => (
                <Link
                  key={notice.noticeId}
                  to={`/notices/${notice.noticeId}`}
                  className="block p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {notice.isPinned && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-bnf-orange/10 dark:bg-bnf-orange/20 text-bnf-orange dark:text-orange-400 text-xs font-medium rounded-full">
                            <Pin className="w-3 h-3" />
                            고정
                          </span>
                        )}
                        {notice.attachmentCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-bnf-gray dark:text-gray-400 text-xs">
                            <Paperclip className="w-3 h-3" />
                            {notice.attachmentCount}
                          </span>
                        )}
                      </div>
                      <h3 className={`font-medium text-bnf-dark dark:text-gray-200 truncate group-hover:text-bnf-blue dark:group-hover:text-bnf-blue transition-colors ${notice.isPinned ? 'font-semibold' : ''}`}>
                        {notice.title}
                      </h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-bnf-gray dark:text-gray-500">
                        <span>{notice.createdByName}</span>
                        <span>{formatDateTime(notice.createdAt)}</span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {notice.viewCount}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-bnf-blue dark:group-hover:text-bnf-blue transition-colors flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>

            {/* 페이지네이션 */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </div>
    </div>
  )
}