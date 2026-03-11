import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi, requestsApi } from '../../api'
import { REQUEST_STATUS } from '../../constants'
import { StatusBadge } from '../../components/common'
import {
  Building2,
  Users,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Activity,
  LayoutDashboard,
  ClipboardList
} from 'lucide-react'

// 우선순위 점 (관리자 대시보드 전용 스타일)
function PriorityDot({ priority }) {
  const colors = {
    LOW: 'bg-gray-400',
    MEDIUM: 'bg-blue-500',
    HIGH: 'bg-orange-500',
    CRITICAL: 'bg-red-500 animate-pulse'
  }
  return <span className={`w-2 h-2 rounded-full ${colors[priority]}`}></span>
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    companies: 0,
    users: 0,
    requests: {
      total: 0,
      submitted: 0,
      assigned: 0,
      inProgress: 0,
      interimReplied: 0,
      completed: 0
    },
    avgResponseTime: '',
    myIncompleteTasks: 0
  })

  const [recentRequests, setRecentRequests] = useState([])
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    const fetchAdminDashboardData = async () => {
      try {
        const [statsRes, requestsRes] = await Promise.all([
          dashboardApi.getAdminStats(),
          requestsApi.getAll({ page: 1, pageSize: 5 })  // 실제 표시하는 2~3개에 맞게 5개로 축소
        ])

        const s = statsRes.data || statsRes
        const requestsStats = s.Requests || s.requests || {}

        setStats({
          companies: s.TotalCompanies ?? s.totalCompanies ?? 0,
          users: s.TotalUsers ?? s.totalUsers ?? 0,
          requests: {
            total: requestsStats.Total ?? requestsStats.total ?? 0,
            submitted: requestsStats.Submitted ?? requestsStats.submitted ?? 0,
            assigned: requestsStats.Assigned ?? requestsStats.assigned ?? 0,
            inProgress: requestsStats.InProgress ?? requestsStats.inProgress ?? 0,
            interimReplied: requestsStats.InterimReplied ?? requestsStats.interimReplied ?? 0,
            completed: requestsStats.Completed ?? requestsStats.completed ?? 0
          },
          avgResponseTime: s.AvgResponseTime ?? s.avgResponseTime ?? '',
          myIncompleteTasks: s.MyIncompleteTasks ?? s.myIncompleteTasks ?? 0
        })

        const list = requestsRes.data.items || []
        let working = list.filter(r =>
          r.status === REQUEST_STATUS.SUBMITTED ||
          r.status === REQUEST_STATUS.ASSIGNED ||
          r.status === REQUEST_STATUS.IN_PROGRESS ||
          r.status === REQUEST_STATUS.INTERIM_REPLIED
        )
        if (working.length === 0) {
          working = list
        }

        const mappedRequests = working.slice(0, 2).map(r => ({
          id: r.requestId ?? r.id,
          title: r.title,
          company: r.companyName,
          status: r.status,
          priority: r.priority,
          createdAt: r.createdAt
        }))

        setRecentRequests(mappedRequests)

        // 서버에서 받아온 실제 최근 활동(AuditLog)으로 설정
        const serverActivities = s.RecentActivities || s.recentActivities || []
        if (serverActivities.length > 0) {
          setRecentActivity(serverActivities.map(a => ({
            type: a.type || a.Type,
            message: a.message || a.Message,
            time: a.time || a.Time
          })))
        } else {
          setRecentActivity([{ message: '최근 활동 내역이 없습니다.', time: '' }])
        }
      } catch (error) {
        console.error('관리자 대시보드 데이터 조회 실패:', error)
      }
    }

    fetchAdminDashboardData()
  }, [])

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-bnf-orange/10 flex items-center justify-center">
          <LayoutDashboard className="w-5 h-5 text-bnf-orange" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-bnf-dark dark:text-white tracking-tight">관리자 대시보드</h1>
          <p className="text-sm text-bnf-gray dark:text-gray-400 mt-1">시스템 현황을 한눈에 확인하세요.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 card-hover dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-bnf-blue/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-bnf-blue" />
            </div>
            <span className="text-xs text-gray-500">전체</span>
          </div>
          <div className="text-3xl font-display font-bold text-bnf-dark dark:text-white mb-1">{stats.companies}</div>
          <div className="text-sm text-bnf-gray dark:text-gray-400">등록 회사</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 card-hover dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-bnf-green/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-bnf-green" />
            </div>
            <span className="text-xs text-gray-500">활성</span>
          </div>
          <div className="text-3xl font-display font-bold text-bnf-dark dark:text-white mb-1">{stats.users}</div>
          <div className="text-sm text-bnf-gray dark:text-gray-400">등록 사용자</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 card-hover dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-bnf-orange/20 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-bnf-orange" />
            </div>
            <span className="text-xs text-orange-400">처리 대기 {stats.requests.submitted + stats.requests.assigned}</span>
          </div>
          <div className="text-3xl font-display font-bold text-bnf-dark dark:text-white mb-1">{stats.requests.total}</div>
          <div className="text-sm text-bnf-gray dark:text-gray-400">총 요청</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 card-hover dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-emerald-500" />
            </div>
            <span className="text-xs text-blue-400">나의 업무</span>
          </div>
          <div className="text-3xl font-display font-bold text-bnf-dark dark:text-white mb-1">{stats.myIncompleteTasks}</div>
          <div className="text-sm text-bnf-gray dark:text-gray-400">배정된 미완료 업무</div>
        </div>
      </div>

      {/* Charts & Tables Row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Request Status Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-bnf-dark dark:text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-bnf-orange" />
            요청 현황
          </h2>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-bnf-gray dark:text-gray-400">전달/담당자 배정</span>
                <span className="text-bnf-dark dark:text-white font-medium">{stats.requests.submitted + stats.requests.assigned}</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${stats.requests.total > 0 ? ((stats.requests.submitted + stats.requests.assigned) / stats.requests.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-bnf-gray dark:text-gray-400">처리중/중간답변</span>
                <span className="text-bnf-dark dark:text-white font-medium">{stats.requests.inProgress + stats.requests.interimReplied}</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-bnf-orange rounded-full"
                  style={{ width: `${stats.requests.total > 0 ? ((stats.requests.inProgress + stats.requests.interimReplied) / stats.requests.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-bnf-gray dark:text-gray-400">완료</span>
                <span className="text-bnf-dark dark:text-white font-medium">{stats.requests.completed}</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-bnf-green rounded-full"
                  style={{ width: `${stats.requests.total > 0 ? (stats.requests.completed / stats.requests.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-bnf-gray dark:text-gray-400">평균 응답 시간</div>
                <div className="text-xl font-bold text-bnf-dark dark:text-white mt-1">{stats.avgResponseTime || '-'}</div>
              </div>
              <Clock className="w-8 h-8 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Recent Requests */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-bnf-dark dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-bnf-orange" />
              처리 필요 요청
            </h2>
            <Link to="/admin/requests" className="text-sm text-bnf-blue hover:underline flex items-center gap-1">
              전체 보기 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentRequests.map(request => (
              <Link key={request.id} to={`/requests/${request.id}`} className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="mt-1"><PriorityDot priority={request.priority} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-500 text-sm">#{request.id}</span>
                      <StatusBadge status={request.status} />
                    </div>
                    <h3 className="text-bnf-dark dark:text-white font-medium truncate">{request.title}</h3>
                    <div className="text-sm text-bnf-gray dark:text-gray-400 mt-1">{request.company}</div>
                  </div>
                  <div className="text-xs text-bnf-gray dark:text-gray-500">
                    {new Date(request.createdAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links & Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Links */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-bnf-dark dark:text-white mb-4">빠른 메뉴</h2>

          <div className="space-y-3">
            <Link
              to="/admin/companies"
              className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
            >
              <Building2 className="w-5 h-5 text-bnf-blue" />
              <span className="text-bnf-dark dark:text-white">회사 관리</span>
              <ArrowRight className="w-4 h-4 text-bnf-gray dark:text-gray-500 ml-auto group-hover:text-bnf-dark dark:group-hover:text-white transition-colors" />
            </Link>

            <Link
              to="/admin/users"
              className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
            >
              <Users className="w-5 h-5 text-bnf-green" />
              <span className="text-bnf-dark dark:text-white">사용자 관리</span>
              <ArrowRight className="w-4 h-4 text-bnf-gray dark:text-gray-500 ml-auto group-hover:text-bnf-dark dark:group-hover:text-white transition-colors" />
            </Link>

            <Link
              to="/admin/registration-codes"
              className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
            >
              <CheckCircle2 className="w-5 h-5 text-bnf-orange" />
              <span className="text-bnf-dark dark:text-white">등록 코드 관리</span>
              <ArrowRight className="w-4 h-4 text-bnf-gray dark:text-gray-500 ml-auto group-hover:text-bnf-dark dark:group-hover:text-white transition-colors" />
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-bnf-dark dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-bnf-green" />
              최근 활동
            </h2>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-bnf-green flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="text-bnf-dark dark:text-white">{activity.message}</div>
                    <div className="text-sm text-bnf-gray dark:text-gray-500 mt-0.5">{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
