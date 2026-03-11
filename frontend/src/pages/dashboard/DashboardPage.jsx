import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { dashboardApi, requestsApi, noticesApi } from '../../api'
import { formatRelativeDate, formatDate } from '../../utils'
import { StatusBadge, PriorityBadge } from '../../components/common'
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Plus,
  ArrowRight,
  MessageSquare,
  Calendar,
  Megaphone,
  Pin,
  ChevronRight
} from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    assigned: 0,
    inProgress: 0,
    interimReplied: 0,
    completed: 0
  })

  const [recentRequests, setRecentRequests] = useState([])
  const [recentNotices, setRecentNotices] = useState([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 모든 API를 병렬로 호출하여 로딩 시간 단축
        const [statsRes, requestsRes, noticesRes] = await Promise.all([
          dashboardApi.getStats(),
          requestsApi.getAll({ page: 1, pageSize: 4 }),
          noticesApi.getRecent(3)
        ])

        const s = statsRes.data || statsRes
        setStats({
          total: s.total ?? s.Total ?? 0,
          submitted: s.submitted ?? s.Submitted ?? 0,
          assigned: s.assigned ?? s.Assigned ?? 0,
          inProgress: s.inProgress ?? s.InProgress ?? 0,
          interimReplied: s.interimReplied ?? s.InterimReplied ?? 0,
          completed: s.completed ?? s.Completed ?? 0
        })

        const list = requestsRes.data.items || []
        const mapped = list.map((r) => ({
          id: r.requestId ?? r.id,
          title: r.title,
          status: r.status,
          priority: r.priority,
          category: r.category,
          createdAt: r.createdAt,
          commentsCount: r.commentsCount
        }))
        setRecentRequests(mapped)

        setRecentNotices(noticesRes.data || [])
      } catch (error) {
        console.error('대시보드 데이터 조회 실패:', error)
      }
    }

    fetchDashboardData()
  }, [])

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-bnf-dark dark:text-white">
          안녕하세요, {(user && user.name) || '사용자'}님! 👋
        </h1>
        <p className="text-bnf-gray dark:text-gray-400 mt-1">
          {(user && user.companyName) || '회사'}의 ERP 유지보수 현황을 확인하세요.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 p-5 card-hover hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-bnf-blue dark:text-blue-400" />
            </div>
            <span className="text-xs text-bnf-gray dark:text-gray-400">전체</span>
          </div>
          <div className="text-2xl font-display font-bold text-bnf-dark dark:text-white">{stats.total}</div>
          <div className="text-sm text-bnf-gray dark:text-gray-400">전체 요청</div>
        </div>

        <div className="card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 p-5 card-hover hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-bnf-orange dark:text-orange-400" />
            </div>
            <span className="text-xs text-bnf-gray dark:text-gray-400">대기중</span>
          </div>
          <div className="text-2xl font-display font-bold text-bnf-dark dark:text-white">{stats.submitted + stats.assigned}</div>
          <div className="text-sm text-bnf-gray dark:text-gray-400">처리 대기</div>
        </div>

        <div className="card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 p-5 card-hover hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
            </div>
            <span className="text-xs text-bnf-gray dark:text-gray-400">진행중</span>
          </div>
          <div className="text-2xl font-display font-bold text-bnf-dark dark:text-white">{stats.inProgress + stats.interimReplied}</div>
          <div className="text-sm text-bnf-gray dark:text-gray-400">처리중인 요청</div>
        </div>

        <div className="card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 p-5 card-hover hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-bnf-green dark:text-green-400" />
            </div>
            <span className="text-xs text-bnf-gray dark:text-gray-400">완료</span>
          </div>
          <div className="text-2xl font-display font-bold text-bnf-dark dark:text-white">{stats.completed}</div>
          <div className="text-sm text-bnf-gray dark:text-gray-400">완료된 요청</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-1 h-full">
          <div className="card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-bnf-orange dark:text-orange-400" />
                <h2 className="text-lg font-display font-semibold text-bnf-dark dark:text-white">공지사항</h2>
              </div>
              <Link
                to="/notices"
                className="text-xs text-bnf-blue dark:text-bnf-blue hover:text-bnf-blue/80 dark:hover:text-bnf-blue/80 hover:underline flex items-center gap-1 transition-colors"
              >
                더보기 <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {recentNotices.length > 0 ? (
              <div className="space-y-1 mt-1">
                {recentNotices.map((notice) => (
                  <Link
                    key={notice.noticeId}
                    to={'/notices/' + notice.noticeId}
                    className="flex items-start gap-3 p-3 -mx-3 rounded-xl hover:bg-orange-50 dark:hover:bg-gray-700/50 transition-all duration-200 group"
                  >
                    {notice.isPinned ? (
                      <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(251,146,60,0.2)] dark:shadow-none">
                        <Pin className="w-4 h-4 text-bnf-orange dark:text-orange-400" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 flex items-center justify-center flex-shrink-0 group-hover:bg-white dark:group-hover:bg-gray-700 group-hover:border-orange-200 dark:group-hover:border-orange-500/50 transition-colors">
                        <Megaphone className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-bnf-orange dark:group-hover:text-orange-400 transition-colors" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="text-sm text-bnf-dark dark:text-gray-200 group-hover:text-bnf-orange dark:group-hover:text-orange-400 truncate font-semibold transition-colors">
                        {notice.title}
                      </div>
                      <div className="text-xs text-bnf-gray dark:text-gray-500 flex items-center gap-1 mt-1.5">
                        <Calendar className="w-3 h-3 opacity-70" />
                        {formatDate(notice.createdAt)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-sm text-bnf-gray dark:text-gray-500 text-center py-6">
                등록된 공지사항이 없습니다.
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 h-full">
          <div className="card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 h-full flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-bnf-dark dark:text-white">최근 요청</h2>
              <Link to="/requests" className="text-sm text-bnf-blue dark:text-bnf-blue hover:text-bnf-blue/80 dark:hover:text-bnf-blue/80 hover:underline flex items-center gap-1 transition-colors">
                전체 보기 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {recentRequests.map((request) => (
                <Link
                  key={request.id}
                  to={'/requests/' + request.id}
                  className="block p-5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={request.status} />
                        <PriorityBadge priority={request.priority} />
                      </div>
                      <h3 className="font-medium text-bnf-dark dark:text-gray-200 truncate">{request.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-bnf-gray dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatRelativeDate(request.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          댓글 {request.commentsCount}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>

            {recentRequests.length === 0 && (
              <div className="p-12 text-center text-bnf-gray dark:text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 dark:opacity-40" />
                <p>등록된 요청이 없습니다</p>
                <Link to="/requests/new" className="btn btn-primary mt-4">
                  첫 요청 작성하기
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div >
  )
}