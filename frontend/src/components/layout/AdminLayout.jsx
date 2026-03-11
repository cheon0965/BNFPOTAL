/**
 * ============================================================================
 * 파일명: AdminLayout.jsx
 * 경로: Frontend/src/components/layout/AdminLayout.jsx
 * 설명: 관리자용 레이아웃 - 내부 사용자(ADMIN, MANAGER, ENGINEER) 전용
 * ----------------------------------------------------------------------------
 * [구성요소]
 *   - 사이드바: 관리자 메뉴 (대시보드, 회사, 사용자, 등록코드, 요청 등)
 *   - 헤더: 알림, 프로필 드롭다운
 *   - 콘텐츠 영역: <Outlet />으로 자식 라우트 렌더링
 *
 * [사용 경로]
 *   /admin/* (회사, 사용자, 등록코드, ERP시스템, 공지사항, 이메일 설정 등)
 *
 * [권한]
 *   ADMIN, MANAGER, ENGINEER 역할만 접근 가능 (App.jsx의 ProtectedRoute)
 *
 * [유지보수 가이드]
 *   - 관리 메뉴 추가: adminNavItems 배열에 항목 추가
 * ============================================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { FooterPolicyLinks } from '../common'
import AdminHelpModal from '../help/AdminHelpModal'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { notificationsApi } from '../../api'
import { useSignalR } from '../../hooks/useSignalR'
import { useNotificationStore } from '../../store/notificationStore'
import NotificationToast from '../common/NotificationToast'
import {
  LayoutDashboard,
  Building2,
  Mail,
  Users,
  KeyRound,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  Settings,
  ChevronDown,
  ArrowLeft,
  FileText,
  Server,
  Megaphone,
  Activity,
  ClipboardList,
  Sun,
  Moon
} from 'lucide-react'

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [helpOpen, setHelpOpen] = useState(false)
  const location = useLocation()
  const { user, logout } = useAuthStore()
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
        navigate(`/admin/requests/${notification.requestId}`)
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

  const navGroups = [
    {
      label: '업무 관리',
      items: [
        { path: '/admin/requests', icon: FileText, label: '요청 관리' },
        { path: '/admin/tasks', icon: ClipboardList, label: '업무 지시' },
      ]
    },
    {
      label: '콘텐츠 관리',
      items: [
        { path: '/admin/notices', icon: Megaphone, label: '공지사항 관리' },
        { path: '/admin/email-templates', icon: Mail, label: '메일 템플릿' },
        { path: '/admin/email-settings', icon: Settings, label: '메일 서버 설정' },
      ]
    },
    {
      label: '시스템 관리',
      items: [
        { path: '/admin/companies', icon: Building2, label: '회사 관리' },
        { path: '/admin/users', icon: Users, label: '사용자 관리' },
        { path: '/admin/registration-codes', icon: Settings, label: '등록 코드 관리' },
        { path: '/admin/erp-systems', icon: Server, label: 'ERP 시스템 관리' },
        { path: '/admin/logs', icon: Activity, label: '시스템 로그' },
      ]
    }
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
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-64 flex flex-col bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          <Link to="/admin"
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
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-bnf-dark dark:text-gray-400"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Back to Portal */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2 btn rounded-lg text-sm text-bnf-gray dark:text-gray-400 hover:text-bnf-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            포털로 돌아가기
          </NavLink>
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 p-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navGroups.map((group, groupIdx) => (
            <div key={group.label} className={groupIdx > 0 ? 'mt-4' : ''}>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {group.label}
              </div>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-bnf-orange text-white shadow-sm'
                      : 'text-bnf-gray hover:bg-gray-100 hover:text-bnf-dark dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* System Info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-bnf-gray dark:text-gray-500">
            <div className="text-bnf-dark dark:text-gray-400">BnF ERP Portal v1.0</div>
            <div className="mt-0.5">© 2026 비앤에프소프트</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen flex flex-col overflow-x-clip">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 transition-colors duration-200">
          <div className="h-full px-4 flex items-center justify-between">
            {/* Left: Menu Button + Title */}
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-bnf-dark dark:text-gray-400"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-bnf-orange" />
                <span className="font-medium text-bnf-dark dark:text-white">관리자 콘솔</span>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Help */}
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="inline-flex items-center gap-1 px-2 py-2 rounded-lg text-sm text-bnf-dark dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden md:inline">도움말</span>
              </button>
              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg text-bnf-dark dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
                  <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-xl shadow-elevated border border-gray-200 dark:border-gray-700 py-2 z-50 animate-scale-in">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <div className="font-medium text-bnf-dark dark:text-white">알림</div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-bnf-orange hover:underline"
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
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${!notification.isRead ? 'bg-bnf-orange/10' : ''
                              }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!notification.isRead ? 'bg-bnf-orange' : 'bg-gray-300 dark:bg-gray-500'}`}></div>
                              <div>
                                <p className={`text-sm ${!notification.isRead ? 'font-medium text-bnf-dark dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
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
                        <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
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
                  <div className="w-8 h-8 bg-bnf-orange rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.name?.charAt(0) || 'A'}
                    </span>
                  </div>
                  <span className="hidden md:block text-sm font-medium text-bnf-dark dark:text-white">
                    {user?.name || '관리자'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-bnf-gray dark:text-gray-400" />
                </button>

                {profileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-elevated border border-gray-200 dark:border-gray-700 py-2 z-50 animate-scale-in">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="font-medium text-bnf-dark dark:text-white">{user?.name}</div>
                        <div className="text-sm text-bnf-gray dark:text-gray-400">{user?.email}</div>
                        <div className="text-xs text-bnf-orange mt-1">{user?.role}</div>
                      </div>
                      <div className="py-1">
                        <Link
                          to="/profile"
                          className="w-full btn text-left text-sm text-bnf-dark dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          onClick={() => setProfileOpen(false)}
                        >
                          <User className="w-4 h-4" />
                          내 프로필
                        </Link>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full btn text-left text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
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
        <main className="p-4 md:p-6 lg:p-8 flex-1 bg-bnf-light dark:bg-gray-900 transition-colors duration-200">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 md:px-6 lg:px-8 py-4 text-xs text-bnf-gray dark:text-gray-500 flex flex-col md:flex-row md:items-center md:justify-between gap-2 transition-colors duration-200">
          <div>
            <span className="font-medium text-bnf-dark dark:text-gray-300">비앤에프소프트</span>
            <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
            <span>주소: 대구 북구 경대로17길 47, 11층 1109호 (복현동,경북대학교아이티융합산업빌딩)</span>
            <span className="mx-2 text-gray-300 dark:text-gray-600 hidden md:inline">|</span>
            <span>대표전화: 053-756-0900</span>
            <span className="mx-2 text-gray-300 dark:text-gray-600 hidden md:inline">|</span>
            <span>팩스번호: 053-756-0960</span>
          </div>
          <FooterPolicyLinks
            linkClassName="text-bnf-gray dark:text-gray-400 hover:text-bnf-dark dark:hover:text-white underline-offset-2 hover:underline text-xs"
          />
        </footer>
      </div>
      <AdminHelpModal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        pathname={location.pathname}
      />
    </div>
  )
}
