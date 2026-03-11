import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useRequests } from '../../hooks'
import { usersApi, requestsApi } from '../../api'
import { STATUS_OPTIONS, PRIORITY_OPTIONS, CATEGORY_FILTER_OPTIONS } from '../../constants'
import { formatRelativeDate, stripHtml, truncateText } from '../../utils'
import { StatusBadge, PriorityBadge, CategoryLabel, Pagination, EmptyState } from '../../components/common'
import {
  Search,
  Plus,
  Calendar,
  MessageSquare,
  ArrowRight,
  FileText,
  X,
  ChevronDown,
  Download,
  Loader2
} from 'lucide-react'


function KeyboardSelect({ options, value, onChange, className = '', placeholder }) {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // 현재 value에 따라 표시될 텍스트 동기화
  useEffect(() => {
    if (!isTyping) {
      const selected = options.find((opt) => opt.value === value)
      if (selected) {
        setInputValue(selected.label)
      } else {
        const placeholderOption = options.find((opt) => opt.value === '')
        if (placeholderOption) {
          setInputValue(placeholderOption.label)
        } else {
          setInputValue('')
        }
      }
    }
  }, [value, options, isTyping])

  // 드롭다운 위치 계산
  const updateDropdownPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      })
    }
  }, [])

  // 드롭다운 열릴 때 위치 계산 및 이벤트 리스너 등록
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition()
      window.addEventListener('scroll', updateDropdownPosition, true)
      window.addEventListener('resize', updateDropdownPosition)
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true)
        window.removeEventListener('resize', updateDropdownPosition)
      }
    }
  }, [isOpen, updateDropdownPosition])

  // 외부 클릭 감지하여 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(event.target)
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target)

      if (isOutsideContainer && isOutsideDropdown) {
        setIsOpen(false)
        setIsTyping(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  // 필터링된 옵션
  const filteredOptions = useMemo(() => {
    if (!isTyping) return options
    if (!inputValue.trim()) return options

    const lower = inputValue.toLowerCase()
    return options.filter((opt) =>
      String(opt.label).toLowerCase().includes(lower)
    )
  }, [inputValue, options, isTyping])

  const handleSelect = (opt) => {
    setInputValue(opt.label)
    onChange(opt.value)
    setIsOpen(false)
    setIsTyping(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const first = filteredOptions[0]
      if (first) {
        handleSelect(first)
      }
    }
    if (e.key === 'Escape') {
      setIsOpen(false)
      setIsTyping(false)
      e.currentTarget.blur()
    }
  }

  const handleInputClick = () => {
    if (isOpen) {
      setIsOpen(false)
      setIsTyping(false)
    } else {
      // 열기 전에 위치 먼저 계산
      updateDropdownPosition()
      setIsOpen(true)
      setIsTyping(false)
    }
  }

  // 드롭다운 Portal 렌더링
  const dropdown = isOpen && createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 9999
      }}
      className="max-h-60 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg text-sm"
    >
      {filteredOptions.map((opt) => (
        <button
          key={opt.value ?? opt.label}
          type="button"
          className={`block w-full px-3 py-2 text-left hover:bg-bnf-light dark:hover:bg-gray-700 transition-colors ${opt.value === value ? 'bg-bnf-blue/10 dark:bg-bnf-blue/20 text-bnf-blue font-medium' : 'text-bnf-dark dark:text-gray-200'
            }`}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleSelect(opt)
          }}
        >
          {opt.label}
        </button>
      ))}
      {filteredOptions.length === 0 && (
        <div className="btn  text-gray-400 text-sm">
          선택 가능한 옵션이 없습니다.
        </div>
      )}
    </div>,
    document.body
  )

  return (
    <div className="relative inline-block" ref={containerRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className={`${className} pr-8 cursor-pointer bg-white dark:bg-gray-800 text-bnf-dark dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-bnf-blue/50 focus:border-bnf-blue`}
          value={inputValue}
          placeholder={placeholder}
          onClick={handleInputClick}
          onChange={(e) => {
            setInputValue(e.target.value)
            setIsTyping(true)
            setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          readOnly={false}
        />
        <ChevronDown
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>
      {dropdown}
    </div>
  )
}


export default function RequestListPage() {
  const { isCustomer } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [exporting, setExporting] = useState(false)

  const {
    requests,
    totalCount,
    totalPages,
    companies,
    loading,
    currentPage,
    pageSize,
    search,
    status,
    priority,
    companyId,
    category,
    createdByUserId,
    hasActiveFilters,
    setSearch,
    setStatus,
    setPriority,
    setCompanyId,
    setCategory,
    setCreatedByUserId,
    setPage,
    setPageSize,
    clearFilters
  } = useRequests({
    search: searchParams.get('q') || '',
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    pageSize: 5
  })

  // 작성자 목록 조회 (내부 사용자만)
  const [users, setUsers] = useState([])
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isCustomer()) {
        try {
          const response = await usersApi.getAll()
          setUsers(response.data || [])
        } catch (err) {
          console.error('사용자 목록 조회 실패:', err)
        }
      }
    }
    fetchUsers()
  }, [isCustomer])

  const handleClearFilters = () => {
    clearFilters()
    setSearchParams({})
  }

  const handleExport = async () => {
    if (exporting || totalCount === 0) return;
    setExporting(true);
    try {
      const response = await requestsApi.exportExcel({
        status,
        priority,
        search,
        category,
        companyId,
        createdByUserId
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

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-bnf-blue/10 dark:bg-bnf-blue/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-bnf-blue dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-bnf-dark dark:text-white tracking-tight">요청 목록</h1>
            <p className="text-sm text-bnf-gray dark:text-gray-400 mt-1">총 {totalCount}개의 요청</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* PC 엑셀 다운로드 버튼 */}
          <button
            onClick={handleExport}
            disabled={exporting || totalCount === 0}
            className={`hidden sm:flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors text-sm
              ${exporting || totalCount === 0
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-700'
                : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 hover:border-green-300 dark:hover:border-green-600'
              }`}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {exporting ? '다운로드 중...' : '엑셀 다운로드'}
          </button>

          {/* 모바일 엑셀 다운로드 아이콘 버튼 */}
          <button
            onClick={handleExport}
            disabled={exporting || totalCount === 0}
            className={`flex sm:hidden items-center justify-center w-10 h-10 rounded-xl transition-colors
              ${exporting || totalCount === 0
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-700'
                : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 hover:border-green-300 dark:hover:border-green-600'
              }`}
            title="엑셀 다운로드"
          >
            {exporting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
          </button>

          {/* 새 요청 버튼 */}
          <Link
            to="/requests/new"
            className="flex items-center justify-center gap-2 btn btn-primary  font-medium text-sm shadow-sm hover:shadow"
          >
            <Plus className="w-4 h-4" />
            새 요청
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 p-4 mb-6 space-y-4">
        {/* Search Input & Clear Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-12 w-full bg-white dark:bg-gray-800 text-bnf-dark dark:text-gray-200 border-gray-200 dark:border-gray-700 focus:ring-bnf-blue/50 focus:border-bnf-blue"
              placeholder="요청 제목 또는 내용 검색..."
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="btn  text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
              초기화
            </button>
          )}
        </div>

        {/* Filter Dropdowns - Grid Layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-center">
          <KeyboardSelect
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
            className="input w-full"
          />

          <KeyboardSelect
            options={PRIORITY_OPTIONS}
            value={priority}
            onChange={setPriority}
            className="input w-full"
          />

          {!isCustomer() && (
            <KeyboardSelect
              options={[
                { value: '', label: '회사 전체' },
                ...companies.map((c) => ({
                  value: String(c.companyId),
                  label: c.name
                }))
              ]}
              value={companyId}
              onChange={setCompanyId}
              className="input w-full"
            />
          )}

          <KeyboardSelect
            options={CATEGORY_FILTER_OPTIONS}
            value={category}
            onChange={setCategory}
            className="input w-full"
          />

          {!isCustomer() && (
            <KeyboardSelect
              options={[
                { value: '', label: '작성자 전체' },
                ...users.map((u) => ({
                  value: String(u.userId),
                  label: `${u.name} (${u.companyName || '-'})`
                }))
              ]}
              value={createdByUserId}
              onChange={setCreatedByUserId}
              className="input w-full"
            />
          )}
        </div>
      </div>

      {/* Request List */}
      <div className="card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 overflow-hidden">
        {requests.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {requests.map((request) => (
              <Link
                key={request.id}
                to={`/requests/${request.id}`}
                className="block p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <StatusBadge status={request.status} />
                      <PriorityBadge priority={request.priority} />
                      <CategoryLabel category={request.category} />
                    </div>

                    <h3 className="text-lg font-medium text-bnf-dark dark:text-gray-200 mb-1 truncate">
                      {request.title}
                    </h3>

                    <p className="text-sm text-bnf-gray dark:text-gray-400 truncate mb-3">
                      {truncateText(stripHtml(request.content), 100)}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-bnf-gray dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatRelativeDate(request.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        댓글 {request.commentsCount}
                      </span>
                      {request.assignedTo && (
                        <span className="text-bnf-blue dark:text-blue-400">
                          담당: {request.assignedTo}
                        </span>
                      )}
                    </div>
                  </div>

                  <ArrowRight className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-2" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="요청이 없습니다"
            description={
              hasActiveFilters
                ? '검색 조건에 맞는 요청이 없습니다. 필터를 변경해보세요.'
                : '아직 등록된 요청이 없습니다. 첫 요청을 작성해보세요!'
            }
            action={
              hasActiveFilters ? (
                <button onClick={handleClearFilters} className="btn btn-secondary">
                  필터 초기화
                </button>
              ) : (
                <Link to="/requests/new" className="btn btn-primary">
                  <Plus className="w-5 h-5" />
                  새 요청 작성
                </Link>
              )
            }
          />
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  )
}
