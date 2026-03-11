import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { noticesApi } from '../../api'
import { Pagination, EmptyState, ActionDropdown } from '../../components/common'
import { formatDateTime } from '../../utils'
import {
  Megaphone,
  Plus,
  Search,
  Pin,
  Eye,
  Paperclip,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  AlertTriangle
} from 'lucide-react'

export default function AdminNoticeListPage() {
  const navigate = useNavigate()
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const menuButtonRefs = useRef({})
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' })

  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  useEffect(() => {
    fetchNotices()
  }, [])


  const fetchNotices = async () => {
    try {
      setLoading(true)
      const response = await noticesApi.getAllAdmin({ pageSize: 500 })
      const data = response.data
      setNotices(data.items || [])
    } catch (error) {
      console.error('공지사항 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 필터링된 공지사항
  const filteredNotices = notices.filter(notice => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return notice.title.toLowerCase().includes(query) ||
        notice.createdByName?.toLowerCase().includes(query)
    }
    return true
  })

  // 정렬 처리
  const sortedNotices = [...filteredNotices].sort((a, b) => {
    // 1순위: 항상 isPinned 가 true 인 것이 먼저 오도록
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }

    if (!sortConfig.key) {
      // 기본 정렬: Pin된 것 안에서는 최신순, 안 된 것 안에서도 최신순
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA; // 내림차순
    }

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Status 정렬 예외 처리 (isActive 기준)
    if (sortConfig.key === 'status') {
      aValue = a.isActive ? 1 : 0;
      bValue = b.isActive ? 1 : 0;
    }
    // Date 정렬은 날짜 객체로 비교
    else if (sortConfig.key === 'createdAt') {
      aValue = new Date(a.createdAt || 0).getTime();
      bValue = new Date(b.createdAt || 0).getTime();
    }
    else {
      aValue = aValue === null || aValue === undefined ? '' : String(aValue);
      bValue = bValue === null || bValue === undefined ? '' : String(bValue);
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // 페이징
  const totalCount = sortedNotices.length
  const totalPages = Math.ceil(totalCount / pageSize)
  const paginatedNotices = sortedNotices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortConfig])

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (size) => {
    setPageSize(size)
    setCurrentPage(1)
  }

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = '';
      key = '';
    }
    setSortConfig({ key, direction });
  }

  const handleMenuOpen = (noticeId, e) => {
    if (menuOpen === noticeId) {
      setMenuOpen(null)
      return
    }
    const buttonEl = e?.currentTarget || menuButtonRefs.current[noticeId]
    if (buttonEl) {
      const rect = buttonEl.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 8,
        left: Math.max(16, rect.right - 192)
      })
    }
    setMenuOpen(noticeId)
  }

  // 고정/해제 토글
  const handleTogglePin = async (notice) => {
    try {
      setActionLoading(true)
      await noticesApi.update(notice.noticeId, { isPinned: !notice.isPinned })
      await fetchNotices()
      setMenuOpen(null)
    } catch (error) {
      console.error('고정 상태 변경 실패:', error)
      alert('고정 상태 변경에 실패했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  // 활성/비활성 토글
  const handleToggleActive = async (notice) => {
    try {
      setActionLoading(true)
      await noticesApi.update(notice.noticeId, { isActive: !notice.isActive })
      await fetchNotices()
      setMenuOpen(null)
    } catch (error) {
      console.error('활성 상태 변경 실패:', error)
      alert('활성 상태 변경에 실패했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  // 삭제
  const handleDelete = async (noticeId) => {
    try {
      setActionLoading(true)
      await noticesApi.delete(noticeId)
      await fetchNotices()
      setDeleteConfirm(null)
      setMenuOpen(null)
    } catch (error) {
      console.error('공지사항 삭제 실패:', error)
      alert('공지사항 삭제에 실패했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuOpen && !e.target.closest('.menu-container')) {
        setMenuOpen(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [menuOpen])

  return (
    <div className="animate-fade-in">
      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700/50 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-50 dark:bg-red-500/20 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-500 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-bnf-dark dark:text-white">공지사항 삭제</h3>
                <p className="text-bnf-gray dark:text-gray-400 text-sm">이 작업은 되돌릴 수 없습니다.</p>
              </div>
            </div>
            <p className="text-bnf-dark dark:text-gray-300 mb-6 font-medium">
              정말로 이 공지사항을 삭제하시겠습니까?
              <br />
              <span className="text-bnf-gray dark:text-gray-400 text-sm font-normal mt-1 block">첨부된 파일도 함께 삭제됩니다.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700/50 text-bnf-dark dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
                disabled={actionLoading}
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2 font-medium"
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-bnf-orange/10 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-bnf-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-bnf-dark dark:text-white tracking-tight">
              공지사항 관리
            </h1>
            <p className="text-sm text-bnf-gray dark:text-gray-400 mt-1">공지사항을 등록하고 관리합니다.</p>
          </div>
        </div>
        <Link
          to="/admin/notices/new"
          className="btn btn-warning"
        >
          <Plus className="w-5 h-5" />
          공지사항 등록
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bnf-gray dark:text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="제목, 작성자로 검색..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 focus:border-bnf-orange transition-colors"
          />
        </div>
      </div>

      {/* Notice List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="w-8 h-8 text-bnf-orange animate-spin mx-auto mb-4" />
            <p className="text-bnf-gray dark:text-gray-400">로딩 중...</p>
          </div>
        ) : paginatedNotices.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-8 h-8 text-bnf-gray dark:text-gray-500 opacity-50" />
            </div>
            <p className="text-base text-bnf-dark dark:text-gray-300 font-medium mb-1">
              {searchQuery ? '검색 결과가 없습니다.' : '등록된 공지사항이 없습니다.'}
            </p>
            <p className="text-sm text-bnf-gray dark:text-gray-500">
              {searchQuery ? '다른 검색어를 입력해 보세요.' : '새로운 공지사항을 등록해 보세요.'}
            </p>
            {!searchQuery && (
              <Link
                to="/admin/notices/new"
                className="btn btn-warning mt-6 inline-flex"
              >
                <Plus className="w-4 h-4 mr-2" />
                첫 공지사항 등록
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* PC Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <th onClick={() => handleSort('status')} className="py-4 px-6 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none text-center">
                      상태 {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('title')} className="py-4 px-6 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                      제목 {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('createdByName')} className="py-4 px-6 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                      작성자 {sortConfig.key === 'createdByName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('createdAt')} className="py-4 px-6 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                      등록일 {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('viewCount')} className="py-4 px-6 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none text-center">
                      조회 {sortConfig.key === 'viewCount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="py-4 px-6 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider text-center">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {paginatedNotices.map((notice) => (
                    <tr
                      key={notice.noticeId}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {notice.isPinned && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 text-orange-500 dark:text-orange-400 text-xs font-medium rounded-full">
                              <Pin className="w-3 h-3" />
                              고정
                            </span>
                          )}
                          {notice.isActive ? (
                            <span className="badge badge-green">
                              활성
                            </span>
                          ) : (
                            <span className="badge badge-gray">
                              비활성
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Link
                          to={`/admin/notices/${notice.noticeId}/edit`}
                          className="font-medium text-bnf-dark dark:text-white hover:text-bnf-orange dark:hover:text-bnf-orange transition-colors flex items-center gap-2"
                        >
                          {notice.title}
                          {
                            notice.attachmentCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-bnf-gray dark:text-gray-500 text-xs mt-0.5">
                                <Paperclip className="w-3.5 h-3.5" />
                                {notice.attachmentCount}
                              </span>
                            )
                          }
                        </Link>
                      </td>
                      <td className="py-4 px-6 text-bnf-dark dark:text-gray-300">{notice.createdByName}</td>
                      <td className="py-4 px-6 text-bnf-gray dark:text-gray-500 text-sm">
                        {formatDateTime(notice.createdAt)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center gap-1 text-bnf-gray dark:text-gray-500 text-sm">
                          <Eye className="w-4 h-4" />
                          {notice.viewCount}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <ActionDropdown>
                          <Link
                            to={`/admin/notices/${notice.noticeId}/edit`}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                          >
                            <Edit2 className="w-4 h-4" />
                            수정
                          </Link>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTogglePin(notice); }}
                            className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                            disabled={actionLoading}
                          >
                            {notice.isPinned ? (
                              <>
                                <ToggleRight className="w-4 h-4 text-bnf-orange" />
                                고정 해제
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-4 h-4 text-bnf-gray dark:text-gray-500" />
                                상단 고정
                              </>
                            )}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleActive(notice); }}
                            className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                            disabled={actionLoading}
                          >
                            {notice.isActive ? (
                              <>
                                <ToggleRight className="w-4 h-4 text-green-500 dark:text-green-400" />
                                비활성화
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-4 h-4 text-bnf-gray dark:text-gray-500" />
                                활성화
                              </>
                            )}
                          </button>
                          <hr className="my-2 border-gray-100 dark:border-gray-700/50" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteConfirm(notice.noticeId)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                          >
                            <Trash2 className="w-4 h-4" />
                            삭제
                          </button>
                        </ActionDropdown>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700/50">
              {
                paginatedNotices.map((notice) => (
                  <div key={notice.noticeId} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    {/* Header: Badges + Menu */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {notice.isPinned && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 text-orange-500 dark:text-orange-400 text-xs font-medium rounded-full">
                            <Pin className="w-3 h-3" />
                            고정
                          </span>
                        )}
                        {notice.isActive ? (
                          <span className="badge badge-green">
                            활성
                          </span>
                        ) : (
                          <span className="badge badge-gray">
                            비활성
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <ActionDropdown>
                          <Link
                            to={`/admin/notices/${notice.noticeId}/edit`}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                          >
                            <Edit2 className="w-4 h-4" />
                            수정
                          </Link>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTogglePin(notice); }}
                            className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                            disabled={actionLoading}
                          >
                            {notice.isPinned ? (
                              <>
                                <ToggleRight className="w-4 h-4 text-bnf-orange" />
                                고정 해제
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-4 h-4 text-bnf-gray dark:text-gray-500" />
                                상단 고정
                              </>
                            )}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleActive(notice); }}
                            className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                            disabled={actionLoading}
                          >
                            {notice.isActive ? (
                              <>
                                <ToggleRight className="w-4 h-4 text-green-500 dark:text-green-400" />
                                비활성화
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-4 h-4 text-bnf-gray dark:text-gray-500" />
                                활성화
                              </>
                            )}
                          </button>
                          <hr className="my-2 border-gray-100 dark:border-gray-700/50" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteConfirm(notice.noticeId)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                          >
                            <Trash2 className="w-4 h-4" />
                            삭제
                          </button>
                        </ActionDropdown>
                      </div>
                    </div>
                    {/* Title */}
                    <Link
                      to={`/admin/notices/${notice.noticeId}/edit`}
                      className="block text-bnf-dark dark:text-white hover:text-bnf-orange dark:hover:text-bnf-orange transition-colors font-medium mb-2"
                    >
                      <span className="flex items-center gap-2">
                        {notice.title}
                        {notice.attachmentCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-bnf-gray dark:text-gray-500 text-xs font-normal">
                            <Paperclip className="w-3.5 h-3.5" />
                            {notice.attachmentCount}
                          </span>
                        )}
                      </span>
                    </Link>
                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                      <span className="text-sm text-bnf-dark dark:text-gray-300 flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-bnf-gray dark:text-gray-400 font-medium">
                            {notice.createdByName.charAt(0)}
                          </span>
                        </div>
                        {notice.createdByName}
                      </span>
                      <span className="flex items-center gap-1 text-bnf-gray dark:text-gray-500 text-xs ml-auto">
                        <Eye className="w-4 h-4" />
                        {notice.viewCount}
                      </span>
                    </div>
                  </div>
                ))
              }
            </div>
          </>
        )}

        {/* Pagination */}
        {sortedNotices.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>
    </div>
  )
}