import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { requestsApi, usersApi } from '../../api'
import {
  Search,
  FileText,
  Clock,
  User,
  Building2,
  ChevronRight,
  CheckCircle,
  UserPlus,
  Loader2,
  Download
} from 'lucide-react'
import { Pagination, ActionDropdown } from '../../components/common'

export default function AdminRequestListPage() {
  const [requests, setRequests] = useState([])
  const [engineers, setEngineers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [menuOpen, setMenuOpen] = useState(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [assignModal, setAssignModal] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const menuButtonRefs = useRef({})
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' })

  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const requestResponse = await requestsApi.getAll({ pageSize: 500 })
        const requestData = requestResponse.data.items || []

        const mapped = requestData.map(r => ({
          id: r.requestId ?? r.id,
          title: r.title,
          companyName: r.companyName,
          createdByName: r.createdBy?.name || '',
          assignedToId: r.assignedTo?.userId || null,
          assignedToName: r.assignedTo?.name || null,
          category: r.category,
          priority: r.priority,
          status: r.status,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt
        }))

        setRequests(mapped)

        const userResponse = await usersApi.getAll()
        const users = userResponse.data || []
        const engineerList = users.filter(u =>
          ['ENGINEER', 'MANAGER', 'ADMIN'].includes(u.role) && u.isActive
        ).map(u => ({
          id: u.userId,
          name: u.name
        }))

        setEngineers(engineerList)
      } catch (error) {
        console.error('데이터 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const statusOptions = [
    { value: '', label: '전체 상태' },
    { value: 'SUBMITTED', label: '전달' },
    { value: 'ASSIGNED', label: '담당자 배정' },
    { value: 'IN_PROGRESS', label: '처리중' },
    { value: 'INTERIM_REPLIED', label: '중간답변완료' },
    { value: 'COMPLETED', label: '완료' },
  ]

  const priorityOptions = [
    { value: '', label: '전체 우선순위' },
    { value: 'CRITICAL', label: '긴급' },
    { value: 'HIGH', label: '높음' },
    { value: 'MEDIUM', label: '보통' },
    { value: 'LOW', label: '낮음' },
  ]

  const getStatusBadge = (status) => {
    const styles = {
      SUBMITTED: 'bg-blue-500/20 text-blue-400',
      ASSIGNED: 'bg-purple-500/20 text-purple-400',
      IN_PROGRESS: 'bg-yellow-500/20 text-yellow-400',
      INTERIM_REPLIED: 'bg-teal-500/20 text-teal-400',
      COMPLETED: 'bg-green-500/20 text-green-400',
    }
    const labels = {
      SUBMITTED: '전달',
      ASSIGNED: '담당자 배정',
      IN_PROGRESS: '처리중',
      INTERIM_REPLIED: '중간답변완료',
      COMPLETED: '완료',
    }
    return <span className={`badge ${styles[status]}`}>{labels[status]}</span>
  }

  const getPriorityDot = (priority) => {
    const colors = {
      CRITICAL: 'bg-red-500',
      HIGH: 'bg-orange-500',
      MEDIUM: 'bg-yellow-500',
      LOW: 'bg-green-500',
    }
    return <span className={`w-2 h-2 rounded-full ${colors[priority]}`} />
  }

  const getCategoryBadge = (category) => {
    const styles = {
      BUG: 'bg-red-500/20 text-red-400',
      QUESTION: 'bg-blue-500/20 text-blue-400',
      IMPROVEMENT: 'bg-green-500/20 text-green-400',
    }
    const labels = {
      BUG: '버그',
      QUESTION: '문의',
      IMPROVEMENT: '개선',
    }
    return <span className={`badge ${styles[category]}`}>{labels[category]}</span>
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 1) return '방금 전'
    if (diffHours < 24) return `${diffHours}시간 전`

    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  const filteredRequests = requests.filter(r => {
    const matchesSearch = !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.companyName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !statusFilter || r.status === statusFilter
    const matchesPriority = !priorityFilter || r.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  // 정렬 처리
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Priority 정렬 예외 처리 (CRITICAL > HIGH > MEDIUM > LOW 순서로)
    if (sortConfig.key === 'priority') {
      const priorityWeights = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, '': 0, null: 0, undefined: 0 };
      aValue = priorityWeights[aValue] || 0;
      bValue = priorityWeights[bValue] || 0;
    }
    // Status 정렬 예외 처리
    else if (sortConfig.key === 'status') {
      const statusWeights = { SUBMITTED: 1, ASSIGNED: 2, IN_PROGRESS: 3, INTERIM_REPLIED: 4, COMPLETED: 5, '': 0, null: 0, undefined: 0 };
      aValue = statusWeights[aValue] || 0;
      bValue = statusWeights[bValue] || 0;
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

  // 페이징 처리
  const totalCount = sortedRequests.length
  const totalPages = Math.ceil(totalCount / pageSize)
  const paginatedRequests = sortedRequests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // 필터 정렬시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, priorityFilter, sortConfig])

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

  const handleMenuOpen = (requestId) => {
    if (menuOpen === requestId) {
      setMenuOpen(null)
      return
    }

    const buttonEl = menuButtonRefs.current[requestId]
    if (buttonEl) {
      const rect = buttonEl.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.right - 192
      })
    }
    setMenuOpen(requestId)
  }

  const handleAssign = async (requestId, engineerId) => {
    if (actionLoading) return;
    setActionLoading(true)
    try {
      await requestsApi.assignTo(requestId, engineerId)

      const engineer = engineers.find(e => e.id === engineerId)
      setRequests(prev => prev.map(r =>
        r.id === requestId ? {
          ...r,
          assignedToId: engineerId,
          assignedToName: engineer?.name || null,
          status: (engineerId && r.status === 'SUBMITTED') ? 'ASSIGNED' : r.status
        } : r
      ))
      setAssignModal(null)
    } catch (error) {
      console.error('담당자 배정 실패:', error)
      alert('담당자 배정에 실패했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStatusChange = async (requestId, newStatus) => {
    if (actionLoading) return;
    setActionLoading(true)
    try {
      await requestsApi.updateStatus(requestId, newStatus)

      setRequests(prev => prev.map(r =>
        r.id === requestId ? { ...r, status: newStatus } : r
      ))
      setMenuOpen(null)
    } catch (error) {
      console.error('상태 변경 실패:', error)
      alert('상태 변경에 실패했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const response = await requestsApi.exportExcel({
        status: statusFilter,
        priority: priorityFilter,
        search: searchQuery
      });

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      link.setAttribute('download', `requests_export_${dateStr}.xlsx`);

      document.body.appendChild(link);
      link.click();

      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('엑셀 다운로드 실패:', error);
      alert('엑셀 다운로드 중 오류가 발생했습니다.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-bnf-orange" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-bnf-orange/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-bnf-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-bnf-dark dark:text-white tracking-tight">요청 관리</h1>
            <p className="text-sm text-bnf-gray dark:text-gray-400 mt-1">전체 요청 {requests.length}건</p>
          </div>
        </div>

        {/* 우측 상단 액션 버튼 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting || sortedRequests.length === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors
              ${exporting || sortedRequests.length === 0
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-green-50 dark:bg-green-600/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-600/30'
              }`}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="text-sm">{exporting ? '다운로드 중...' : '엑셀 다운로드'}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative col-span-1 md:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bnf-gray dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 focus:border-bnf-orange transition-colors"
              placeholder="제목, 회사 검색..."
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
          >
            {priorityOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* PC Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <th onClick={() => handleSort('title')} className="text-left px-6 py-4 text-sm font-medium text-bnf-gray dark:text-gray-400 cursor-pointer hover:text-bnf-orange transition-colors select-none">
                  요청 {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('companyName')} className="text-left px-6 py-4 text-sm font-medium text-bnf-gray dark:text-gray-400 cursor-pointer hover:text-bnf-orange transition-colors select-none">
                  회사 {sortConfig.key === 'companyName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('status')} className="text-center px-6 py-4 text-sm font-medium text-bnf-gray dark:text-gray-400 cursor-pointer hover:text-bnf-orange transition-colors select-none">
                  상태 {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('assignedToName')} className="text-center px-6 py-4 text-sm font-medium text-bnf-gray dark:text-gray-400 cursor-pointer hover:text-bnf-orange transition-colors select-none">
                  담당자 {sortConfig.key === 'assignedToName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('updatedAt')} className="text-left px-6 py-4 text-sm font-medium text-bnf-gray dark:text-gray-400 cursor-pointer hover:text-bnf-orange transition-colors select-none">
                  업데이트 {sortConfig.key === 'updatedAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-center px-6 py-4 text-sm font-medium text-bnf-gray dark:text-gray-400">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {paginatedRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2 mt-1">
                        {getPriorityDot(request.priority)}
                      </div>
                      <div>
                        <Link
                          to={`/requests/${request.id}`}
                          className="font-medium text-bnf-dark dark:text-white hover:text-bnf-orange transition-colors"
                        >
                          {request.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          {getCategoryBadge(request.category)}
                          <span className="text-xs text-bnf-gray dark:text-gray-500">#{request.id}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-bnf-dark dark:text-gray-300">{request.companyName}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-bnf-gray dark:text-gray-500">
                      <User className="w-3 h-3" />
                      {request.createdByName}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {request.assignedToName ? (
                      <span className="text-bnf-dark dark:text-gray-300">{request.assignedToName}</span>
                    ) : (
                      <button
                        onClick={() => setAssignModal(request.id)}
                        className="text-bnf-orange hover:text-orange-400 flex items-center gap-1 mx-auto"
                      >
                        <UserPlus className="w-4 h-4" />
                        배정
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-bnf-gray dark:text-gray-400 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(request.updatedAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center relative">
                    <ActionDropdown>
                      <Link
                        to={`/requests/${request.id}`}
                        className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                      >
                        <ChevronRight className="w-4 h-4" />
                        상세 보기
                      </Link>
                      <button
                        onClick={() => setAssignModal(request.id)}
                        className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                      >
                        <UserPlus className="w-4 h-4" />
                        담당자 배정
                      </button>
                      <hr className="my-2 border-gray-200 dark:border-gray-600" />
                      {request.status !== 'IN_PROGRESS' &&
                        request.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleStatusChange(request.id, 'IN_PROGRESS')}
                            disabled={actionLoading}
                            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2.5 transition-colors whitespace-nowrap
                            ${actionLoading
                                ? 'opacity-60 cursor-not-allowed bg-yellow-50 dark:bg-yellow-500/5 text-yellow-600 dark:text-yellow-300'
                                : 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-500/10'}`}
                          >
                            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            <Clock className="w-4 h-4" />
                            <span>{actionLoading ? '처리중으로 변경 중...' : '처리중으로 변경'}</span>
                          </button>
                        )}
                      {request.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleStatusChange(request.id, 'COMPLETED')}
                          disabled={actionLoading}
                          className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2.5 transition-colors whitespace-nowrap
                            ${actionLoading
                              ? 'opacity-60 cursor-not-allowed bg-green-50 dark:bg-green-500/5 text-green-600 dark:text-green-300'
                              : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10'}`}
                        >
                          {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                          <CheckCircle className="w-4 h-4" />
                          <span>{actionLoading ? '완료 처리 중...' : '완료 처리'}</span>
                        </button>
                      )}
                    </ActionDropdown>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
          {paginatedRequests.map((request) => (
            <div key={request.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                  {getPriorityDot(request.priority)}
                  {getCategoryBadge(request.category)}
                  <span className="text-xs text-bnf-gray dark:text-gray-500">#{request.id}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 relative">
                  {getStatusBadge(request.status)}
                  <ActionDropdown>
                    <Link
                      to={`/requests/${request.id}`}
                      className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                    >
                      <ChevronRight className="w-4 h-4" />
                      상세 보기
                    </Link>
                    <button
                      onClick={() => { setAssignModal(request.id); setMenuOpen(null); }}
                      className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                    >
                      <UserPlus className="w-4 h-4" />
                      담당자 배정
                    </button>
                    <hr className="my-2 border-gray-200 dark:border-gray-600" />

                    {request.status !== 'IN_PROGRESS' &&
                      request.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleStatusChange(request.id, 'IN_PROGRESS')}
                          disabled={actionLoading}
                          className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2.5 transition-colors whitespace-nowrap
                          ${actionLoading
                              ? 'opacity-60 cursor-not-allowed bg-yellow-50 dark:bg-yellow-500/5 text-yellow-600 dark:text-yellow-300'
                              : 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-500/10'}`}
                        >
                          {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                          <Clock className="w-4 h-4" />
                          <span>{actionLoading ? '처리중으로 변경 중...' : '처리중으로 변경'}</span>
                        </button>
                      )}
                    {request.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleStatusChange(request.id, 'COMPLETED')}
                        disabled={actionLoading}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2.5 transition-colors whitespace-nowrap
                          ${actionLoading
                            ? 'opacity-60 cursor-not-allowed bg-green-50 dark:bg-green-500/5 text-green-600 dark:text-green-300'
                            : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10'}`}
                      >
                        {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        <CheckCircle className="w-4 h-4" />
                        <span>{actionLoading ? '완료 처리 중...' : '완료 처리'}</span>
                      </button>
                    )}
                  </ActionDropdown>
                </div>
              </div>
              {/* Title */}
              <Link
                to={`/requests/${request.id}`}
                className="block font-medium text-bnf-dark dark:text-white hover:text-bnf-orange transition-colors mb-2"
              >
                {request.title}
              </Link>
              {/* Company + Creator */}
              <div className="flex items-center gap-3 text-sm text-bnf-gray dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                  {request.companyName}
                </span>
                <span className="flex items-center gap-1.5 text-bnf-gray dark:text-gray-500">
                  <User className="w-3 h-3" />
                  {request.createdByName}
                </span>
              </div>
              {/* Footer */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                {request.assignedToName ? (
                  <span className="text-sm text-bnf-dark dark:text-gray-300 flex items-center gap-1.5">
                    <div className="w-5 h-5 bg-bnf-blue/20 rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 text-bnf-blue" />
                    </div>
                    {request.assignedToName}
                  </span>
                ) : (
                  <button
                    onClick={() => setAssignModal(request.id)}
                    className="text-sm text-bnf-orange hover:text-orange-400 flex items-center gap-1.5 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    담당자 배정
                  </button>
                )}
                <span className="flex items-center gap-1.5 text-xs text-bnf-gray dark:text-gray-500">
                  <Clock className="w-3 h-3" />
                  {formatDate(request.updatedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {sortedRequests.length === 0 && (
          <div className="p-12 text-center text-bnf-gray dark:text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-bnf-dark dark:text-gray-400">요청이 없습니다</p>
          </div>
        )}

        {/* 페이지네이션 */}
        {sortedRequests.length > 0 && (
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



      {/* Assign Modal */}
      {
        assignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70" onClick={() => setAssignModal(null)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 animate-scale-in">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-display font-bold text-bnf-dark dark:text-white">담당자 배정</h2>
              </div>

              <div className="p-6 space-y-2">
                {engineers.map(eng => (
                  <button
                    key={eng.id}
                    onClick={() => handleAssign(assignModal, eng.id)}
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-left text-bnf-dark dark:text-white flex items-center gap-3 transition-colors"
                  >
                    <div className="w-8 h-8 bg-bnf-blue rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">{eng.name.charAt(0)}</span>
                    </div>
                    {eng.name}
                  </button>
                ))}

                <button
                  onClick={() => handleAssign(assignModal, null)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg text-left text-bnf-gray dark:text-gray-400 transition-colors"
                >
                  배정 해제
                </button>
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setAssignModal(null)}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-bnf-dark dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  )
}
