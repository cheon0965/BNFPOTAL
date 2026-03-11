import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { tasksApi } from '../../api'
import { useAuthStore } from '../../store/authStore'
import { Pagination } from '../../components/common'
import { stripHtml } from '../../utils'
import {
    ClipboardList,
    Search,
    Clock,
    User,
    Plus,
    Loader2,
    AlertCircle,
    CheckCircle2,
    XCircle,
    PlayCircle,
    CalendarDays,
    X
} from 'lucide-react'

export default function TaskListPage() {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)

    // 필터 & 페이지
    const [tab, setTab] = useState('assigned')
    const [searchText, setSearchText] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [priorityFilter, setPriorityFilter] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [companyFilter, setCompanyFilter] = useState('')
    const [companies, setCompanies] = useState([])
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [sortConfig, setSortConfig] = useState({ key: '', direction: '' })

    const hasActiveFilters = searchText || statusFilter || priorityFilter || categoryFilter || companyFilter

    const clearFilters = () => {
        setSearchText('')
        setStatusFilter('')
        setPriorityFilter('')
        setCategoryFilter('')
        setCompanyFilter('')
    }

    useEffect(() => {
        fetchTasks()
    }, [tab])

    useEffect(() => {
        fetchCompanies()
    }, [])

    const fetchTasks = async () => {
        try {
            setLoading(true)
            const response = await tasksApi.getAll({
                tab,
                pageSize: 500
            })
            setTasks(response.data.items || [])
        } catch (error) {
            console.error('업무 목록 조회 실패:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchCompanies = async () => {
        try {
            const res = await tasksApi.getCompanies()
            setCompanies(res.data || [])
        } catch (error) {
            console.error('회사 목록 조회 실패:', error)
        }
    }

    const filteredTasks = tasks.filter(task => {
        if (searchText) {
            const q = searchText.toLowerCase()
            const matchTitle = task.title?.toLowerCase().includes(q)
            const matchContent = stripHtml(task.content || '').toLowerCase().includes(q)
            const matchCompany = task.companyName?.toLowerCase().includes(q)
            if (!matchTitle && !matchContent && !matchCompany) return false
        }
        if (statusFilter && task.status !== statusFilter) return false;
        if (priorityFilter && task.priority !== priorityFilter) return false;
        if (categoryFilter && task.category !== categoryFilter) return false;
        if (companyFilter && task.companyId !== parseInt(companyFilter)) return false;
        return true;
    });

    const sortedTasks = [...filteredTasks].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'createdby') {
            aValue = a.createdBy?.name || '';
            bValue = b.createdBy?.name || '';
        } else if (sortConfig.key === 'assignedto') {
            aValue = a.assignedTo?.name || '';
            bValue = b.assignedTo?.name || '';
        } else if (sortConfig.key === 'duedate' || sortConfig.key === 'createdAt') {
            aValue = aValue ? new Date(aValue).getTime() : 0;
            bValue = bValue ? new Date(bValue).getTime() : 0;
        } else {
            aValue = aValue === null || aValue === undefined ? '' : String(aValue);
            bValue = bValue === null || bValue === undefined ? '' : String(bValue);
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const totalCount = sortedTasks.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const paginatedTasks = sortedTasks.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );
    const personSortKey = tab === 'created' ? 'assignedto' : 'createdby'
    const personColumnLabel = tab === 'created' ? '담당자' : '지시자'
    const personName = (task) => (tab === 'created' ? task.assignedTo?.name : task.createdBy?.name)

    // 필터 변경 시 첫 페이지로 이동
    useEffect(() => {
        setCurrentPage(1)
    }, [tab, searchText, statusFilter, priorityFilter, categoryFilter, companyFilter, sortConfig])

    const handleExport = async () => {
        if (exporting || sortedTasks.length === 0) return;
        setExporting(true);
        try {
            const response = await tasksApi.exportExcel({
                status: statusFilter,
                priority: priorityFilter,
                category: categoryFilter,
                companyId: companyFilter,
                search: searchText
            });

            const blob = response.data;
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            link.setAttribute('download', `tasks_export_${dateStr}.xlsx`);

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

    const statusOptions = [
        { value: '', label: '전체 상태' },
        { value: 'PENDING', label: '대기' },
        { value: 'IN_PROGRESS', label: '진행중' },
        { value: 'COMPLETED', label: '완료' },
        { value: 'CANCELLED', label: '취소' },
    ]

    const priorityOptions = [
        { value: '', label: '전체 우선순위' },
        { value: 'CRITICAL', label: '긴급' },
        { value: 'HIGH', label: '높음' },
        { value: 'MEDIUM', label: '보통' },
        { value: 'LOW', label: '낮음' },
    ]

    const categoryOptions = [
        { value: '', label: '전체 카테고리' },
        { value: 'GENERAL', label: '일반' },
        { value: 'DEVELOPMENT', label: '개발' },
        { value: 'REVIEW', label: '검토/리뷰' },
        { value: 'MEETING', label: '회의' },
        { value: 'OTHER', label: '기타' },
    ]

    const getStatusBadge = (status) => {
        const styles = {
            PENDING: 'bg-blue-500/20 text-blue-400',
            IN_PROGRESS: 'bg-yellow-500/20 text-yellow-400',
            COMPLETED: 'bg-green-500/20 text-green-400',
            CANCELLED: 'bg-gray-500/20 text-gray-400',
        }
        const labels = {
            PENDING: '대기',
            IN_PROGRESS: '진행중',
            COMPLETED: '완료',
            CANCELLED: '취소',
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
            GENERAL: 'bg-gray-500/20 text-gray-400',
            DEVELOPMENT: 'bg-purple-500/20 text-purple-400',
            REVIEW: 'bg-teal-500/20 text-teal-400',
            MEETING: 'bg-indigo-500/20 text-indigo-400',
            OTHER: 'bg-gray-500/20 text-gray-400',
        }
        const labels = {
            GENERAL: '일반',
            DEVELOPMENT: '개발',
            REVIEW: '검토/리뷰',
            MEETING: '회의',
            OTHER: '기타',
        }
        return <span className={`badge ${styles[category]}`}>{labels[category]}</span>
    }

    const formatDate = (dateString) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now - date
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        if (diffHours < 1) return '방금 전'
        if (diffHours < 24) return `${diffHours}시간 전`
        return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    }

    const formatFullDate = (dateString) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    }

    const handleSort = (key) => {
        let direction = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = ''
            key = ''
        }
        setSortConfig({ key, direction })
    }

    if (loading && tasks.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-bnf-orange" />
            </div>
        )
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-bnf-orange/10 flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-bnf-orange" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-bnf-dark dark:text-white tracking-tight">업무 지시</h1>
                        <p className="text-sm text-bnf-gray dark:text-gray-400 mt-1">내부 업무 지시 및 보고를 관리합니다</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* PC 엑셀 다운로드 버튼 */}
                    <button
                        onClick={handleExport}
                        disabled={exporting || sortedTasks.length === 0}
                        className={`hidden sm:flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors text-sm
                            ${exporting || sortedTasks.length === 0
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-700'
                                : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 hover:border-green-300 dark:hover:border-green-600'
                            }`}
                    >
                        {exporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        )}
                        {exporting ? '다운로드 중..' : '엑셀 다운로드'}
                    </button>

                    {/* 모바일 엑셀 다운로드 아이콘 버튼 */}
                    <button
                        onClick={handleExport}
                        disabled={exporting || sortedTasks.length === 0}
                        className={`flex sm:hidden items-center justify-center w-10 h-10 rounded-xl transition-colors
                            ${exporting || sortedTasks.length === 0
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-700'
                                : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 hover:border-green-300 dark:hover:border-green-600'
                            }`}
                        title="엑셀 다운로드"
                    >
                        {exporting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        )}
                    </button>

                    <button
                        onClick={() => navigate('/admin/tasks/new')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-bnf-orange text-white rounded-xl hover:bg-orange-600 transition-colors font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm">업무 지시</span>
                    </button>
                </div>
            </div>

            {/* Tab */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setTab('assigned')}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${tab === 'assigned'
                        ? 'bg-bnf-orange text-white border-bnf-orange'
                        : 'bg-white dark:bg-gray-800 text-bnf-gray dark:text-gray-400 hover:bg-gray-50 hover:text-bnf-dark dark:hover:bg-gray-700 dark:hover:text-white border-gray-200 dark:border-gray-700'
                        }`}
                >
                    나에게 할당된 업무
                </button>
                <button
                    onClick={() => setTab('created')}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${tab === 'created'
                        ? 'bg-bnf-orange text-white border-bnf-orange'
                        : 'bg-white dark:bg-gray-800 text-bnf-gray dark:text-gray-400 hover:bg-gray-50 hover:text-bnf-dark dark:hover:bg-gray-700 dark:hover:text-white border-gray-200 dark:border-gray-700'
                        }`}
                >
                    내가 지시한 업무
                </button>
                <button
                    onClick={() => setTab('referenced')}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${tab === 'referenced'
                        ? 'bg-bnf-orange text-white border-bnf-orange'
                        : 'bg-white dark:bg-gray-800 text-bnf-gray dark:text-gray-400 hover:bg-gray-50 hover:text-bnf-dark dark:hover:bg-gray-700 dark:hover:text-white border-gray-200 dark:border-gray-700'
                        }`}
                >
                    참조 업무
                </button>
            </div>

            {/* Search & Filters */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-4 mb-6 shadow-sm space-y-4">
                {/* Search Input */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 placeholder-gray-400 dark:placeholder-gray-500"
                            placeholder="업무 제목, 내용 또는 회사명으로 검색..."
                        />
                    </div>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors whitespace-nowrap flex-shrink-0"
                        >
                            <X className="w-4 h-4" />
                            초기화
                        </button>
                    )}
                </div>

                {/* Filter Dropdowns */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-bnf-orange/50"
                    >
                        {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-bnf-orange/50"
                    >
                        {priorityOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-bnf-orange/50"
                    >
                        {categoryOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <select
                        value={companyFilter}
                        onChange={(e) => setCompanyFilter(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-bnf-orange/50"
                    >
                        <option value="">전체 회사</option>
                        {companies.map(c => (
                            <option key={c.companyId} value={c.companyId}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                {/* PC Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                                <th onClick={() => handleSort('title')} className="text-left px-6 py-4 text-sm font-medium text-bnf-gray dark:text-gray-400 cursor-pointer hover:text-bnf-orange transition-colors select-none">
                                    업무 {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('company')} className="text-center px-6 py-4 text-sm font-medium text-bnf-gray dark:text-gray-400 cursor-pointer hover:text-bnf-orange transition-colors select-none">
                                    회사 {sortConfig.key === 'company' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort(personSortKey)} className="text-center px-6 py-4 text-sm font-medium text-bnf-gray dark:text-gray-400 cursor-pointer hover:text-bnf-orange transition-colors select-none">
                                    {personColumnLabel} {sortConfig.key === personSortKey && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('status')} className="text-center px-6 py-4 text-sm font-medium text-bnf-gray dark:text-gray-400 cursor-pointer hover:text-bnf-orange transition-colors select-none">
                                    상태 {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('duedate')} className="text-center px-6 py-4 text-sm font-medium text-bnf-gray dark:text-gray-400 cursor-pointer hover:text-bnf-orange transition-colors select-none">
                                    마감일 {sortConfig.key === 'duedate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-bnf-gray dark:text-gray-400">등록일</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {paginatedTasks.map((task) => (
                                <tr key={task.taskId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-start gap-3">
                                            <div className="flex items-center gap-2 mt-1">
                                                {getPriorityDot(task.priority)}
                                            </div>
                                            <div>
                                                <Link
                                                    to={`/admin/tasks/${task.taskId}`}
                                                    className="font-medium text-bnf-dark dark:text-white hover:text-bnf-orange dark:hover:text-bnf-orange transition-colors"
                                                >
                                                    {task.title}
                                                </Link>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {getCategoryBadge(task.category)}
                                                    {task.commentsCount > 0 && (
                                                        <span className="text-xs text-bnf-gray dark:text-gray-500">💬 {task.commentsCount}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-gray-600 dark:text-gray-300 text-sm">
                                            {task.companyName || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <User className="w-3 h-3 text-bnf-gray dark:text-gray-500" />
                                            <span className="text-gray-600 dark:text-gray-300 text-sm">
                                                {personName(task)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {getStatusBadge(task.status)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {task.dueDate ? (
                                            <div className="flex items-center justify-center gap-1 text-sm">
                                                <CalendarDays className="w-3 h-3 text-bnf-gray dark:text-gray-500" />
                                                <span className={`${new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' ? 'text-red-500 dark:text-red-400' : 'text-bnf-gray dark:text-gray-400'}`}>
                                                    {formatFullDate(task.dueDate)}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 dark:text-gray-600 text-sm">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-bnf-gray dark:text-gray-400 text-sm">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDate(task.createdAt)}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                    {paginatedTasks.map((task) => (
                        <Link
                            key={task.taskId}
                            to={`/admin/tasks/${task.taskId}`}
                            className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                    {getPriorityDot(task.priority)}
                                    <span className="font-medium text-bnf-dark dark:text-white text-sm truncate">{task.title}</span>
                                </div>
                                {getStatusBadge(task.status)}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-bnf-gray dark:text-gray-500 mt-2">
                                {getCategoryBadge(task.category)}
                                {task.companyName && (
                                    <span className="text-xs text-bnf-gray dark:text-gray-400">🏢 {task.companyName}</span>
                                )}
                                <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {personName(task)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(task.createdAt)}
                                </span>
                                {task.commentsCount > 0 && <span>💬 {task.commentsCount}</span>}
                            </div>
                        </Link>
                    ))}
                </div>

                {sortedTasks.length === 0 && (
                    <div className="p-12 text-center text-bnf-gray dark:text-gray-500">
                        <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>업무가 없습니다</p>
                    </div>
                )}

                {/* Pagination */}
                {sortedTasks.length > 0 && (
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


