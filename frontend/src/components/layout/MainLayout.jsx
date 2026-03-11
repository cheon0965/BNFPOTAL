/**
 * ============================================================================
 * 파일명: MainLayout.jsx
 * 경로: Frontend/src/components/layout/MainLayout.jsx
 * 설명: 일반 사용자용 메인 레이아웃 - 사이드바, 헤더, 푸터 포함
 * ----------------------------------------------------------------------------
 * [구성요소]
 *   - 사이드바: 대시보드, 요청 목록, 새 요청, 공지사항, 관리자 메뉴(내부용)
 *   - 헤더: 알림, 프로필 드롭다운, 도움말, 회사/사용자 정보
 *   - 콘텐츠 영역: <Outlet />으로 자식 라우트 렌더링
 *   - 푸터: 회사 정보, 정책 링크
 *
 * [사용 경로]
 *   /dashboard, /requests, /requests/new, /notices, /profile, /help
 *
 * [유지보수 가이드]
 *   - 메뉴 추가: navItems 배열에 항목 추가
 *   - 스타일 변경: Tailwind 클래스 수정
 *   - 반응형: 모바일 사이드바 토글 로직 확인
 * ============================================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { FooterPolicyLinks } from '../common'
import CustomerHelpModal from '../help/CustomerHelpModal'
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { notificationsApi, companiesApi } from '../../api'
import { useSignalR } from '../../hooks/useSignalR'
import { useNotificationStore } from '../../store/notificationStore'
import NotificationToast from '../common/NotificationToast'
import {
  FileText,
  Plus,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield,
  Megaphone,
  Sun,
  Moon
} from 'lucide-react'

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [companyInfo, setCompanyInfo] = useState(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const location = useLocation()
  const { user, logout, isAdmin } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const notificationRef = useRef(null)
  const toastNotification = useNotificationStore(s => s.toastNotification)

  const fetchNotifications = useCallback(async () => {
    if (!user) return

    try {
      const response = await notificationsApi.getAll()
      setNotifications(response.data)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }, [user])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (!toastNotification) return
    fetchNotifications()
  }, [toastNotification, fetchNotifications])


  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        if (!user || !user.companyId) {
          setCompanyInfo(null)
          return
        }

        const response = await companiesApi.getMy()
        setCompanyInfo(response.data)
      } catch (error) {
        console.error('Failed to fetch company info:', error)
      }
    }

    if (user) {
      fetchCompanyInfo()
    }
  }, [user, location.pathname])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await notificationsApi.markAsRead(notification.notificationId)
        setNotifications(prev => prev.map(n =>
          n.notificationId === notification.notificationId ? { ...n, isRead: true } : n
        ))
      }
      setNotificationOpen(false)
      if (notification.taskId) {
        navigate(`/admin/tasks/${notification.taskId}`)
      } else if (notification.requestId) {
        navigate(`/requests/${notification.requestId}`)
      }
    } catch (error) {
      console.error('Failed to handle notification click:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  const navItems = [
    { path: '/notices', icon: Megaphone, label: '공지사항' },
    { path: '/requests', icon: FileText, label: '요청 목록' },
    { path: '/requests/new', icon: Plus, label: '새 요청 작성' },
  ]

  // SignalR 실시간 알림 연결
  useSignalR()

  return (
    <div className="min-h-screen bg-bnf-light dark:bg-gray-900 transition-colors duration-200">
      {/* 실시간 알림 토스트 */}
      <NotificationToast />
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-64 flex flex-col bg-white dark:bg-gray-800 shadow-elevated transform transition-transform duration-300
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-700">
          <Link to="/dashboard"
            className="flex items-center gap-3 group"
            onClick={() => setSidebarOpen(false)}
          >
            <img
              src={theme === 'dark' ? "/header-logo-admin.png" : "/header-logo.png"}
              alt="(주)비앤에프소프트"
              className="h-8 md:h-9 lg:h-10 object-contain"
            />
          </Link>
          <button
            className="lg:hidden p-2 rounded-lg text-bnf-dark dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 p-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/requests'}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200
                ${isActive
                  ? 'bg-bnf-blue text-white shadow-sm'
                  : 'text-bnf-gray dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-bnf-dark dark:hover:text-white'
                }
              `}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}

          {/* Admin Link */}
          {isAdmin() && (
            <>
              <div className="my-4 border-t border-gray-100 dark:border-gray-700/50"></div>
              <NavLink
                to="/admin"
                className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-bnf-gray dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-bnf-dark dark:hover:text-white transition-all duration-200"
                onClick={() => setSidebarOpen(false)}
              >
                <Shield className="w-5 h-5" />
                관리자 메뉴
              </NavLink>
            </>
          )}
        </nav>

        {/* Company Info */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 transition-colors">
          <div className="text-xs text-bnf-gray dark:text-gray-400">
            <div className="font-medium text-bnf-dark dark:text-gray-200">{user?.companyName || '회사명'}</div>
            <div className="mt-0.5">
              {companyInfo && companyInfo.isActive === false
                ? '유지보수 계약 만료'
                : '유지보수 계약 활성'}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen flex flex-col overflow-x-clip">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-30 transition-colors">
          <div className="h-full px-4 flex items-center justify-between">
            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 rounded-lg text-bnf-dark dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Page Title - Mobile */}
            <div className="lg:hidden font-display font-semibold text-bnf-dark dark:text-white">
              <Link to="/dashboard">
                {user?.companyName || 'BnF Portal'}
              </Link>
            </div>



            <div className="flex items-center gap-2 ml-auto">
              {/* Help */}
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="inline-flex items-center gap-1 px-2 py-2 rounded-lg text-sm text-bnf-dark dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden md:inline">도움말</span>
              </button>
              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg text-bnf-dark dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
              </button>
              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <button
                  className={`relative p-2 rounded-lg transition-colors ${notificationOpen ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  onClick={() => setNotificationOpen(!notificationOpen)}
                >
                  <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-bnf-dark dark:text-white' : 'text-bnf-gray dark:text-gray-400'}`} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </button>

                {notificationOpen && (
                  <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-xl shadow-elevated border border-gray-100 dark:border-gray-700 py-2 z-50 animate-scale-in">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                      <div className="font-medium text-bnf-dark dark:text-white">알림</div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-bnf-blue dark:text-bnf-blue hover:text-bnf-blue/80 dark:hover:text-bnf-blue/80 hover:underline"
                        >
                          모두 읽음
                        </button>
                      )}
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map(notification => (
                          <button
                            key={notification.notificationId}
                            onClick={() => handleNotificationClick(notification)}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${!notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                              }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!notification.isRead ? 'bg-bnf-blue' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                              <div>
                                <p className={`text-sm ${!notification.isRead ? 'font-medium text-bnf-dark dark:text-white' : 'text-bnf-gray dark:text-gray-400'}`}>
                                  {notification.message}
                                </p>
                                <p className="text-xs text-bnf-gray dark:text-gray-500 mt-1">
                                  {new Date(notification.createdAt).toLocaleString('ko-KR', {
                                    month: 'numeric',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-bnf-gray dark:text-gray-400 text-sm">
                          새로운 알림이 없습니다.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setProfileOpen(!profileOpen)}
                >
                  <div className="w-8 h-8 bg-bnf-blue rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <span className="hidden md:block text-sm font-medium text-bnf-dark dark:text-gray-200">
                    {user?.name || '사용자'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-bnf-gray dark:text-gray-400" />
                </button>

                {profileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-elevated border border-gray-100 dark:border-gray-700 py-2 z-50 animate-scale-in">
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                        <div className="font-medium text-bnf-dark dark:text-white">{user?.name}</div>
                        <div className="text-sm text-bnf-gray dark:text-gray-400">{user?.email}</div>
                      </div>
                      <div className="py-1">
                        <Link
                          to="/profile"
                          className="w-full btn px-4 py-2 text-left text-sm text-bnf-gray dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2"
                          onClick={() => setProfileOpen(false)}
                        >
                          <User className="w-4 h-4" />
                          내 프로필
                        </Link>
                      </div>
                      <div className="border-t border-gray-100 dark:border-gray-700 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full btn px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          로그아웃
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>

        {/* Footer - fixed at bottom */}
        <footer className="mt-auto border-t border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-4 md:px-6 lg:px-8 py-4 text-xs text-bnf-gray dark:text-gray-500 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <span className="font-medium text-bnf-dark dark:text-gray-400">비앤에프소프트</span>
            <span className="mx-2 text-gray-300 dark:text-gray-700">|</span>
            <span>주소: 대구 북구 경대로17길 47, 11층 1109호 (복현동,경북대학교아이티융합산업빌딩)</span>
            <span className="mx-2 text-gray-300 dark:text-gray-700 hidden md:inline">|</span>
            <span>대표전화: 053-756-0900</span>
            <span className="mx-2 text-gray-300 dark:text-gray-700 hidden md:inline">|</span>
            <span>팩스번호: 053-756-0960</span>
          </div>
          <FooterPolicyLinks
            linkClassName="text-bnf-gray dark:text-gray-400 hover:text-bnf-blue dark:hover:text-bnf-blue underline-offset-2 hover:underline text-xs"
          />
        </footer>
      </div>
      <CustomerHelpModal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        pathname={location.pathname}
      />
    </div>
  )
}
