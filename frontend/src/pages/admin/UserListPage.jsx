import { useState, useEffect, useRef } from 'react'
import {
  Search,
  Plus,
  User,
  Users,
  Edit3,
  Trash2,
  Mail,
  Building2,
  Shield,
  X,
  Check
} from 'lucide-react'

import { Pagination, ActionDropdown } from '../../components/common'
import { USER_ROLES } from '../../constants'
import { usersApi } from '../../api'

export default function UserListPage() {
  const [users, setUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({ name: '', email: '', role: USER_ROLES.CUSTOMER, isActive: true })
  const [menuOpen, setMenuOpen] = useState(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const menuButtonRefs = useRef({})
  const [resettingUserId, setResettingUserId] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' })

  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await usersApi.getAll()
        const data = response.data || []

        const mapped = data.map((u) => {
          let role = u.role
          // 기존 DB에 남아 있을 수 있는 레거시 고객 역할(CUSTOMER_USER, CUSTOMER_ADMIN 등)을
          // 모두 단일 CUSTOMER 역할로 정규화
          if (![USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ENGINEER, USER_ROLES.CUSTOMER].includes(role)) {
            role = USER_ROLES.CUSTOMER
          }

          return {
            id: u.userId ?? u.id,
            name: u.name,
            email: u.email,
            role: role,
            companyId: u.companyId,
            companyName: u.companyName,
            isActive: u.isActive,
            lastLoginAt: u.lastLoginAt,
            isProtected: (u.userId ?? u.id) === 1 && u.companyId === 1
          }
        })

        setUsers(mapped)
      } catch (error) {
        console.error('사용자 목록 조회 실패:', error)
      }
    }

    fetchUsers()
  }, [])

  const roleOptions = [
    { value: '', label: '전체 역할' },
    { value: USER_ROLES.CUSTOMER, label: '고객' },
    { value: USER_ROLES.ENGINEER, label: '엔지니어' },
    { value: USER_ROLES.MANAGER, label: '매니저' },
    { value: USER_ROLES.ADMIN, label: '시스템 관리자' },
  ]

  const getRoleBadge = (role) => {
    const styles = {
      CUSTOMER: 'bg-gray-600 text-gray-200',
      ENGINEER: 'bg-green-500/20 text-green-400',
      MANAGER: 'bg-purple-500/20 text-purple-400',
      ADMIN: 'bg-red-500/20 text-red-400',
    }
    const labels = {
      CUSTOMER: '고객',
      ENGINEER: '엔지니어',
      MANAGER: '매니저',
      ADMIN: '관리자',
    }
    return <span className={`badge ${styles[role]}`}>{labels[role]}</span>
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.companyName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = !roleFilter || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  // 정렬 처리
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Status (isActive)
    if (sortConfig.key === 'isActive') {
      aValue = a.isActive ? 1 : 0;
      bValue = b.isActive ? 1 : 0;
    }
    // 날짜 정렬 처리
    else if (sortConfig.key === 'lastLoginAt') {
      aValue = new Date(a.lastLoginAt || 0).getTime();
      bValue = new Date(b.lastLoginAt || 0).getTime();
    }
    // Role 정렬 예외 처리 (ADMIN > MANAGER > ENGINEER > CUSTOMER)
    else if (sortConfig.key === 'role') {
      const roleWeights = { ADMIN: 4, MANAGER: 3, ENGINEER: 2, CUSTOMER: 1, '': 0 };
      aValue = roleWeights[aValue] || 0;
      bValue = roleWeights[bValue] || 0;
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
  const totalCount = sortedUsers.length
  const totalPages = Math.ceil(totalCount / pageSize)
  const paginatedUsers = sortedUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // 필터 및 정렬 변경 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, roleFilter, sortConfig])

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

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const openEditModal = (user) => {
    setEditingUser(user)
    setFormData({ name: user.name, email: user.email, role: user.role, isActive: user.isActive })
    setShowModal(true)
    setMenuOpen(null)
  }

  const handleMenuOpen = (userId) => {
    if (menuOpen === userId) {
      setMenuOpen(null)
      return
    }

    const buttonEl = menuButtonRefs.current[userId]
    if (buttonEl) {
      const rect = buttonEl.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.right - 192
      })
    }
    setMenuOpen(userId)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!editingUser) {
      setShowModal(false)
      return
    }

    try {
      await usersApi.update(editingUser.id, {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive
      })

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id ? { ...u, ...formData } : u
        )
      )
      setShowModal(false)
    } catch (error) {
      console.error('사용자 수정 실패:', error)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) {
      setMenuOpen(null)
      return
    }

    try {
      await usersApi.delete(id)
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch (error) {
      console.error('사용자 삭제 실패:', error)
    } finally {
      setMenuOpen(null)
    }
  }

  const handleResetPassword = async (id) => {
    if (resettingUserId) return

    if (!confirm('해당 사용자의 비밀번호를 초기화하시겠습니까?')) {
      setMenuOpen(null)
      return
    }

    try {
      setResettingUserId(id)
      const res = await usersApi.resetPassword(id)
      const message = res?.data?.message || '비밀번호를 초기화하고 사용자 이메일로 발송했습니다.'
      alert(message)
    } catch (error) {
      console.error('비밀번호 초기화 실패:', error)
      alert('비밀번호 초기화 중 오류가 발생했습니다.')
    } finally {
      setResettingUserId(null)
      setMenuOpen(null)
    }
  }

  const toggleActive = async (id) => {
    const target = users.find((u) => u.id === id)
    if (!target) return

    try {
      await usersApi.update(id, { isActive: !target.isActive })
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, isActive: !u.isActive } : u
        )
      )
    } catch (error) {
      console.error('사용자 상태 변경 실패:', error)
    } finally {
      setMenuOpen(null)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-bnf-orange/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-bnf-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-bnf-dark dark:text-white tracking-tight">사용자 관리</h1>
            <p className="text-sm text-bnf-gray dark:text-gray-400 mt-1">등록된 사용자 {users.length}명</p>
          </div>
        </div>
      </div>

      {/* Filters - Grid Layout */}
      <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative col-span-1 md:col-span-2 lg:col-span-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bnf-gray dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 focus:border-bnf-orange transition-colors"
              placeholder="이름, 이메일, 회사 검색..."
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
          >
            {roleOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* PC Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th onClick={() => handleSort('name')} className="px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                  사용자 {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('companyName')} className="px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                  회사 {sortConfig.key === 'companyName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('role')} className="text-center px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                  역할 {sortConfig.key === 'role' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('isActive')} className="text-center px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                  상태 {sortConfig.key === 'isActive' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('lastLoginAt')} className="px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                  마지막 로그인 {sortConfig.key === 'lastLoginAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-bnf-blue rounded-xl flex items-center justify-center">
                        <span className="text-white font-medium">{user.name.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-medium text-bnf-dark dark:text-white">{user.name}</div>
                        <div className="text-sm text-bnf-gray dark:text-gray-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3.5 h-3.5" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2 text-bnf-dark dark:text-gray-300">
                      <Building2 className="w-4 h-4 text-bnf-gray dark:text-gray-500" />
                      {user.companyName}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {user.isActive ? (
                      <span className="badge badge-green">활성</span>
                    ) : (
                      <span className="badge badge-gray">비활성</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-bnf-gray dark:text-gray-500 text-sm">
                    {formatDate(user.lastLoginAt)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <ActionDropdown>
                      <button
                        onClick={() => openEditModal(user)}
                        className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                      >
                        <Edit3 className="w-4 h-4" />
                        수정
                      </button>
                      {!user.isProtected && (
                        <button
                          onClick={() => toggleActive(user.id)}
                          className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                        >
                          {user.isActive ? (
                            <>
                              <X className="w-4 h-4" />
                              비활성화
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              활성화
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleResetPassword(user.id)}
                        disabled={resettingUserId === user.id}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2.5 transition-colors whitespace-nowrap ${resettingUserId === user.id ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                      >
                        <Shield className={`w-4 h-4 ${resettingUserId === user.id ? 'animate-spin' : ''}`} />
                        {resettingUserId === user.id ? '비밀번호 초기화 메일 발송 중...' : '비밀번호 초기화'}
                      </button>
                      {!user.isProtected && (
                        <>
                          <hr className="my-2 border-gray-100 dark:border-gray-700/50" />
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="w-full px-4 py-2 text-left text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                          >
                            <Trash2 className="w-4 h-4" />
                            삭제
                          </button>
                        </>
                      )}
                    </ActionDropdown>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700/50">
          {paginatedUsers.map((user) => (
            <div key={user.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              {/* Header: Avatar + Info + Menu */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-bnf-blue rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-white font-medium">{user.name.charAt(0)}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-bnf-dark dark:text-white">{user.name}</div>
                    <div className="text-sm text-bnf-gray dark:text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      {user.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 relative">
                  {getRoleBadge(user.role)}
                  <ActionDropdown>
                    <button
                      onClick={() => openEditModal(user)}
                      className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                    >
                      <Edit3 className="w-4 h-4" />
                      수정
                    </button>
                    {!user.isProtected && (
                      <button
                        onClick={() => toggleActive(user.id)}
                        className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                      >
                        {user.isActive ? (
                          <>
                            <X className="w-4 h-4" />
                            비활성화
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            활성화
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleResetPassword(user.id)}
                      disabled={resettingUserId === user.id}
                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2.5 transition-colors whitespace-nowrap ${resettingUserId === user.id ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      <Shield className={`w-4 h-4 ${resettingUserId === user.id ? 'animate-spin' : ''}`} />
                      {resettingUserId === user.id ? '메일 발송 중...' : '비밀번호 초기화'}
                    </button>
                    {!user.isProtected && (
                      <>
                        <hr className="my-2 border-gray-100 dark:border-gray-700/50" />
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="w-full px-4 py-2 text-left text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                        >
                          <Trash2 className="w-4 h-4" />
                          삭제
                        </button>
                      </>
                    )}
                  </ActionDropdown>
                </div>
              </div>
              {/* Footer */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-sm text-bnf-gray dark:text-gray-400">
                    <Building2 className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                    {user.companyName}
                  </span>
                  {user.isActive ? (
                    <span className="badge badge-green">활성</span>
                  ) : (
                    <span className="badge badge-gray">비활성</span>
                  )}
                </div>
                <span className="text-xs text-bnf-gray dark:text-gray-500 font-medium">{formatDate(user.lastLoginAt)}</span>
              </div>
            </div>
          ))}
        </div>

        {sortedUsers.length === 0 && (
          <div className="p-16 text-center text-bnf-gray dark:text-gray-400">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-1">
                <User className="w-6 h-6 text-bnf-gray dark:text-gray-500 opacity-50" />
              </div>
              <p className="text-base text-bnf-dark dark:text-gray-300 font-medium">사용자를 찾을 수 없습니다</p>
              <p className="text-sm text-bnf-gray dark:text-gray-500">다른 검색어를 입력해 보세요.</p>
            </div>
          </div>
        )}

        {/* 페이지네이션 */}
        {sortedUsers.length > 0 && (
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



      {/* Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700/50 animate-scale-in">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700/50">
              <h2 className="text-xl font-display font-bold text-bnf-dark dark:text-white">사용자 수정</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">이름</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">이메일</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">역할</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
                >
                  {roleOptions.filter(o => o.value).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="userIsActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-bnf-orange focus:ring-bnf-orange bg-white dark:bg-gray-900/50 transition-colors"
                />
                <label htmlFor="userIsActive" className="text-bnf-dark dark:text-gray-300">활성 상태</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700/50 text-bnf-dark dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-bnf-orange text-white rounded-xl hover:bg-orange-500 transition-colors flex items-center justify-center gap-2 font-medium shadow-orange"
                >
                  <Edit3 className="w-5 h-5" />
                  저장

                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}