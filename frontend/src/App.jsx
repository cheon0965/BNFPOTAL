/**
 * ============================================================================
 * 파일명: App.jsx
 * 경로: Frontend/src/App.jsx
 * 설명: 애플리케이션 루트 컴포넌트 - 라우팅 및 레이아웃 설정
 * ----------------------------------------------------------------------------
 * [라우트 구조]
 *   / (루트)
 *   ├── /login, /register          - AuthLayout (비로그인 전용)
 *   ├── /dashboard                  - MainLayout (일반 사용자)
 *   ├── /requests, /requests/:id   - MainLayout
 *   ├── /notices, /notices/:id     - MainLayout
 *   ├── /profile, /help            - MainLayout
 *   └── /admin/*                   - AdminLayout (내부 사용자 전용)
 *       ├── companies, users, registration-codes
 *       ├── requests, erp-systems
 *       ├── notices, email-templates, email-settings
 *       └── help
 *
 * [라우트 가드]
 *   - ProtectedRoute: 로그인 필수, 역할 제한 가능
 *   - PublicRoute: 비로그인 전용 (로그인 시 /dashboard로 리다이렉트)
 *
 * [유지보수 가이드]
 *   - 새 페이지 추가: 해당 레이아웃의 Route에 추가
 *   - 관리자 전용: AdminLayout 하위에 추가, allowedRoles 확인
 *   - 권한 변경: ProtectedRoute의 allowedRoles 수정
 * ============================================================================
 */

import { useLayoutEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'

// ErrorBoundary 컴포넌트 추가
import ErrorBoundary from './components/common/ErrorBoundary'

// React Query 글로벌 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // 탭 전환 시 매번 재조회 금지
      retry: 1, // 실패 시 1회 재시도
      staleTime: 5 * 60 * 1000, // 5분 동안은 캐시 유지
    },
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// 레이아웃 컴포넌트 (레이아웃은 초기 화면 렌더링 속도 향상을 위해 동기 임포트 유지)
// ─────────────────────────────────────────────────────────────────────────────
import MainLayout from './components/layout/MainLayout'
import AdminLayout from './components/layout/AdminLayout'
import AuthLayout from './components/layout/AuthLayout'

// ─────────────────────────────────────────────────────────────────────────────
// 페이지 컴포넌트 Lazy Loading (Code Splitting 적용)
// ─────────────────────────────────────────────────────────────────────────────
// Auth
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'))

// Common & Dashboard
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const RequestListPage = lazy(() => import('./pages/requests/RequestListPage'))
const RequestDetailPage = lazy(() => import('./pages/requests/RequestDetailPage'))
const RequestCreatePage = lazy(() => import('./pages/requests/RequestCreatePage'))
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'))
const CustomerHelpPage = lazy(() => import('./pages/help/CustomerHelpPage'))
const NoticeListPage = lazy(() => import('./pages/notices/NoticeListPage'))
const NoticeDetailPage = lazy(() => import('./pages/notices/NoticeDetailPage'))

// Admin
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const CompanyListPage = lazy(() => import('./pages/admin/CompanyListPage'))
const UserListPage = lazy(() => import('./pages/admin/UserListPage'))
const RegistrationCodeListPage = lazy(() => import('./pages/admin/RegistrationCodeListPage'))
const AdminRequestListPage = lazy(() => import('./pages/admin/AdminRequestListPage'))
const ErpSystemListPage = lazy(() => import('./pages/admin/ErpSystemListPage'))
const AdminNoticeListPage = lazy(() => import('./pages/admin/AdminNoticeListPage'))
const AdminNoticeFormPage = lazy(() => import('./pages/admin/AdminNoticeFormPage'))
const EmailTemplateListPage = lazy(() => import('./pages/admin/EmailTemplateListPage'))
const EmailSettingsPage = lazy(() => import('./pages/admin/EmailSettingsPage'))
const AdminHelpPage = lazy(() => import('./pages/admin/AdminHelpPage'))
const SystemLogListPage = lazy(() => import('./pages/admin/SystemLogListPage'))
const TaskListPage = lazy(() => import('./pages/tasks/TaskListPage'))
const TaskDetailPage = lazy(() => import('./pages/tasks/TaskDetailPage'))
const TaskFormPage = lazy(() => import('./pages/tasks/TaskFormPage'))

// Lazy Load 컴포넌트를 불러오는 동안 보여줄 로딩 폴백 UI
const PageFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-bnf-blue border-t-transparent rounded-full animate-spin"></div>
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// 라우트 가드 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 보호된 라우트 - 로그인 필수, 역할 제한 가능
 * @param {Object} props
 * @param {React.ReactNode} props.children - 자식 컴포넌트
 * @param {string[]} [props.allowedRoles] - 허용 역할 배열 (없으면 모든 로그인 사용자)
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuthStore()

  // 비로그인 시 로그인 페이지로
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // 역할 제한이 있고, 현재 사용자 역할이 허용 목록에 없으면 대시보드로
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

/**
 * 공개 라우트 - 비로그인 전용 (로그인 상태면 대시보드로 리다이렉트)
 * @param {Object} props
 * @param {React.ReactNode} props.children - 자식 컴포넌트
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

// ─────────────────────────────────────────────────────────────────────────────
// 앱 메인 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

const ThemeController = () => {
  const { theme } = useThemeStore()
  const location = useLocation()

  // 테마 상태 및 현재 경로에 따라 html 태그에 클래스 적용
  useLayoutEffect(() => {
    const root = document.documentElement
    const isAuthRoute = ['/login', '/register', '/reset-password'].includes(location.pathname)

    // 테마 전환 시점의 색상/배경 transition을 잠깐 비활성화해
    // 전체 요소가 같은 프레임에서 동시에 전환되도록 강제한다.
    root.classList.add('theme-switching')

    if (theme === 'dark' && !isAuthRoute) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Reflow 후 2프레임 뒤 transition 복구
    void root.offsetHeight
    let raf1 = 0
    let raf2 = 0
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        root.classList.remove('theme-switching')
      })
    })

    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      root.classList.remove('theme-switching')
    }
  }, [theme, location.pathname])

  return null
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <ThemeController />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* ═══════════════════════════════════════════════════════════════════
                인증 라우트 (비로그인 전용)
        ═══════════════════════════════════════════════════════════════════ */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                } />
                <Route path="/register" element={
                  <PublicRoute>
                    <RegisterPage />
                  </PublicRoute>
                } />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
              </Route>

              {/* ═══════════════════════════════════════════════════════════════════
            일반 사용자 라우트 (로그인 필수)
        ═══════════════════════════════════════════════════════════════════ */}
              <Route element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/requests" element={<RequestListPage />} />
                <Route path="/requests/new" element={<RequestCreatePage />} />
                <Route path="/requests/:id" element={<RequestDetailPage />} />
                <Route path="/notices" element={<NoticeListPage />} />
                <Route path="/notices/:id" element={<NoticeDetailPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/help" element={<CustomerHelpPage />} />
              </Route>

              {/* ═══════════════════════════════════════════════════════════════════
            관리자 라우트 (내부 사용자만: ADMIN, MANAGER, ENGINEER)
        ═══════════════════════════════════════════════════════════════════ */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'ENGINEER']}>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AdminDashboardPage />} />
                <Route path="companies" element={<CompanyListPage />} />
                <Route path="users" element={<UserListPage />} />
                <Route path="registration-codes" element={<RegistrationCodeListPage />} />
                <Route path="requests" element={<AdminRequestListPage />} />
                <Route path="requests/:id" element={<RequestDetailPage />} />
                <Route path="erp-systems" element={<ErpSystemListPage />} />
                <Route path="notices" element={<AdminNoticeListPage />} />
                <Route path="notices/new" element={<AdminNoticeFormPage />} />
                <Route path="notices/:id/edit" element={<AdminNoticeFormPage />} />
                <Route path="email-templates" element={<EmailTemplateListPage />} />
                <Route path="email-settings" element={<EmailSettingsPage />} />
                <Route path="logs" element={<SystemLogListPage />} />
                <Route path="tasks" element={<TaskListPage />} />
                <Route path="tasks/new" element={<TaskFormPage />} />
                <Route path="tasks/:id" element={<TaskDetailPage />} />
                <Route path="tasks/:id/edit" element={<TaskFormPage />} />
                <Route path="help" element={<AdminHelpPage />} />
              </Route>

              {/* ═══════════════════════════════════════════════════════════════════
            기본 리다이렉트 및 404
        ═══════════════════════════════════════════════════════════════════ */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              <Route path="*" element={
                <div className="min-h-screen flex items-center justify-center bg-bnf-light">
                  <div className="text-center animate-fade-in">
                    <h1 className="text-6xl font-display font-bold text-bnf-blue mb-4">404</h1>
                    <p className="text-bnf-gray mb-6">페이지를 찾을 수 없습니다</p>
                    <Link to="/dashboard" className="btn btn-primary">홈으로 돌아가기</Link>
                  </div>
                </div>
              } />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary >
      <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
    </QueryClientProvider>
  )
}

export default App
