import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { auditLogsApi } from '../../api'
import { Pagination } from '../../components/common'
import {
    FileText,
    Search,
    Filter,
    RefreshCw,
    Clock,
    User,
    Activity,
    ArrowRight,
    Database
} from 'lucide-react'

export default function SystemLogListPage() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)

    // Filters
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(5)
    const [entityTypeList, setEntityTypeList] = useState([
        { value: 'AUTH', label: '인증/로그인' },
        { value: 'REQUEST', label: '유지보수 문의' },
        { value: 'COMMENT', label: '문의 답변' },
        { value: 'NOTICE', label: '공지사항' },
        { value: 'NOTICE_ATTACHMENT', label: '공지 첨부파일' },
        { value: 'USER', label: '사용자 설정' },
        { value: 'COMPANY', label: '고객사 설정' },
        { value: 'ERP_SYSTEM', label: 'ERP 시스템' },
        { value: 'REGISTRATION_CODE', label: '회원가입 코드' },
        { value: 'EMAIL_SETTING', label: '이메일 서버' },
        { value: 'EMAIL_TEMPLATE', label: '이메일 템플릿' }
    ])
    const [filters, setFilters] = useState({
        entityType: '',
        actionName: '',
        userId: ''
    })
    const [sortConfig, setSortConfig] = useState({ key: '', direction: '' })

    useEffect(() => {
        fetchLogs()
    }, [currentPage, pageSize, filters, sortConfig])

    const fetchLogs = async () => {
        try {
            setLoading(true)
            const response = await auditLogsApi.getAll({
                page: currentPage,
                pageSize: pageSize,
                sortKey: sortConfig.key,
                sortDir: sortConfig.direction,
                ...filters
            })

            setLogs(response.data.items)
            setTotalPages(Math.ceil(response.data.totalCount / response.data.pageSize))
            setTotalCount(response.data.totalCount)
            setError('')
        } catch (err) {
            console.error('Failed to fetch audit logs:', err)
            setError('시스템 로그 목록을 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    const handleFilterChange = (e) => {
        const { name, value } = e.target
        setFilters(prev => ({
            ...prev,
            [name]: value
        }))
        setCurrentPage(1)
    }

    const resetFilters = () => {
        setFilters({
            entityType: '',
            actionName: '',
            userId: ''
        })
        setSortConfig({ key: '', direction: '' })
        setCurrentPage(1)
    }

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        } else if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = '';
            key = '';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-bnf-orange/10 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-bnf-orange" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-bnf-dark dark:text-white tracking-tight">시스템 로그</h1>
                        <p className="text-sm text-bnf-gray dark:text-gray-400 mt-1">
                            시스템 내에서 발생하는 주요 이벤트를 모니터링합니다.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchLogs}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 text-bnf-dark dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 font-medium"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="text-sm">새로고침</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl mb-6">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <Activity className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Entity Type Filter */}
                        <div>
                            <div className="relative">
                                <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bnf-gray dark:text-gray-500" />
                                <select
                                    name="entityType"
                                    value={filters.entityType}
                                    onChange={handleFilterChange}
                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 appearance-none transition-colors"
                                >
                                    <option value="">전체 구분</option>
                                    {entityTypeList.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-5 h-5 text-bnf-gray dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Action Name Filter */}
                        <div>
                            <div className="relative">
                                <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bnf-gray dark:text-gray-500" />
                                <select
                                    name="actionName"
                                    value={filters.actionName}
                                    onChange={handleFilterChange}
                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 appearance-none transition-colors"
                                >
                                    <option value="">전체 액션</option>
                                    <option value="LOGIN_SUCCESS">로그인</option>
                                    <option value="LOGOUT">로그아웃</option>
                                    <option value="CREATE">생성</option>
                                    <option value="UPDATE">수정</option>
                                    <option value="DELETE">삭제</option>
                                    <option value="STATUS_CHANGE">상태변경</option>
                                    <option value="PASSWORD_RESET">비밀번호초기화</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-5 h-5 text-bnf-gray dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                        <button
                            onClick={resetFilters}
                            disabled={loading || Object.values(filters).every(v => v === '')}
                            className="px-4 py-3 text-sm text-bnf-gray dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-bnf-dark dark:hover:text-white transition-colors whitespace-nowrap disabled:opacity-50 font-medium"
                        >
                            초기화
                        </button>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Table Header Info */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                    <div className="text-sm text-bnf-gray dark:text-gray-400">
                        총 <span className="font-semibold text-bnf-dark dark:text-white">{totalCount.toLocaleString()}</span>건의 로그가 존재합니다
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {/* PC View */}
                    <div className="hidden md:block">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    <th onClick={() => handleSort('createdAt')} className="px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                                        시간 {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('userName')} className="px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                                        사용자 {sortConfig.key === 'userName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('entityType')} className="px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                                        구분(Entity) {sortConfig.key === 'entityType' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('action')} className="px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                                        액션(Action) {sortConfig.key === 'action' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider">상세내용</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {loading && logs.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-bnf-gray dark:text-gray-400">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 text-bnf-orange animate-spin">
                                                    <RefreshCw className="w-5 h-5" />
                                                </div>
                                                <span>데이터를 불러오는 중입니다...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-16 text-center text-bnf-gray dark:text-gray-400">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-1">
                                                    <FileText className="w-6 h-6 text-bnf-gray dark:text-gray-500" />
                                                </div>
                                                <p className="text-base text-bnf-dark dark:text-gray-300 font-medium">조회된 시스템 로그가 없습니다</p>
                                                <p className="text-sm text-bnf-gray dark:text-gray-500">다른 필터 조건을 선택해 보세요.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.auditLogId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                    <Clock className="w-3.5 h-3.5 text-bnf-gray dark:text-gray-500" />
                                                    <span className="text-sm text-bnf-dark dark:text-gray-300">
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-bnf-dark dark:text-gray-300 flex items-center justify-center text-xs font-medium shrink-0">
                                                        {log.userName?.[0] || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm text-bnf-dark dark:text-gray-200 group-hover:text-bnf-orange transition-colors">{log.userName}</div>
                                                        <div className="text-xs text-bnf-gray dark:text-gray-500">{log.userEmail}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-bnf-dark dark:text-gray-300">
                                                    {log.entityType}
                                                    {log.entityId > 0 && <span className="ml-1 text-bnf-gray dark:text-gray-500">#{log.entityId}</span>}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${log.action.includes('SUCCESS') ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20' :
                                                    log.action.includes('CREATE') ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20' :
                                                        log.action.includes('FAIL') || log.action.includes('DELETE') ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20' :
                                                            'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20'
                                                    }`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 min-w-[200px]">
                                                {(log.oldValue || log.newValue) ? (
                                                    <div className="text-sm text-bnf-dark dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
                                                        {log.oldValue && log.newValue && log.oldValue !== 'N/A' ? (
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="line-through text-red-500 dark:text-red-400/80">{log.oldValue}</span>
                                                                <ArrowRight className="w-3 h-3 text-bnf-gray dark:text-gray-500" />
                                                                <span className="font-medium text-green-600 dark:text-green-400">{log.newValue}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="font-mono text-xs">{log.newValue || log.oldValue}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-bnf-gray dark:text-gray-600 italic">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View */}
                    <div className="block md:hidden">
                        {loading && logs.length === 0 ? (
                            <div className="p-12 text-center text-bnf-gray dark:text-gray-400">
                                <div className="flex flex-col items-center justify-center gap-3">
                                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 text-bnf-orange animate-spin">
                                        <RefreshCw className="w-5 h-5" />
                                    </div>
                                    <span>데이터를 불러오는 중입니다...</span>
                                </div>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="p-16 text-center text-bnf-gray dark:text-gray-400">
                                <div className="flex flex-col items-center justify-center gap-3">
                                    <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-1">
                                        <FileText className="w-6 h-6 text-bnf-gray dark:text-gray-500" />
                                    </div>
                                    <p className="text-base text-bnf-dark dark:text-gray-300 font-medium">조회된 시스템 로그가 없습니다</p>
                                    <p className="text-sm text-bnf-gray dark:text-gray-500">다른 필터 조건을 선택해 보세요.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {logs.map((log) => (
                                    <div key={log.auditLogId} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-bnf-dark dark:text-gray-300 flex items-center justify-center text-xs font-medium shrink-0">
                                                    {log.userName?.[0] || 'U'}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-sm text-bnf-dark dark:text-gray-200">{log.userName}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-80">
                                                <Clock className="w-3 h-3 text-bnf-gray dark:text-gray-500" />
                                                <span className="text-xs text-bnf-gray dark:text-gray-400">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-bnf-dark dark:text-gray-300">
                                                {log.entityType}
                                                {log.entityId > 0 && <span className="ml-1 text-bnf-gray dark:text-gray-500">#{log.entityId}</span>}
                                            </span>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${log.action.includes('SUCCESS') ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20' :
                                                log.action.includes('CREATE') ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20' :
                                                    log.action.includes('FAIL') || log.action.includes('DELETE') ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20' :
                                                        'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20'
                                                }`}>
                                                {log.action}
                                            </span>
                                        </div>

                                        {(log.oldValue || log.newValue) && (
                                            <div className="text-xs text-bnf-dark dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
                                                {log.oldValue && log.newValue && log.oldValue !== 'N/A' ? (
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="line-through text-red-500 dark:text-red-400/80">{log.oldValue}</span>
                                                        <ArrowRight className="w-3 h-3 text-bnf-gray dark:text-gray-500" />
                                                        <span className="font-medium text-green-600 dark:text-green-400">{log.newValue}</span>
                                                    </div>
                                                ) : (
                                                    <span className="font-mono text-xs">{log.newValue || log.oldValue}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalCount={totalCount}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={(size) => {
                            setPageSize(size)
                            setCurrentPage(1)
                        }}
                    />
                )}
            </div>
        </div>
    )
}
