import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../api'
import {
  User,
  Mail,
  Building2,
  Shield,
  Calendar,
  Lock,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Phone
} from 'lucide-react'

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || ''
  })
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const getRoleName = (role) => {
    const names = {
      CUSTOMER: '고객',
      ENGINEER: '엔지니어',
      MANAGER: '매니저',
      ADMIN: '시스템 관리자'
    }
    return names[role] || role
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileError('')
    setProfileSaved(false)
    setProfileLoading(true)

    try {
      const response = await authApi.updateProfile({
        name: profileForm.name,
        email: profileForm.email,
        phoneNumber: profileForm.phoneNumber
      })

      // authStore 업데이트
      updateUser(response.data)

      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch (err) {
      setProfileError(err.response?.data?.message || '프로필 수정에 실패했습니다.')
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSaved(false)

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('새 비밀번호는 8자 이상이어야 합니다.')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.')
      return
    }

    setPasswordLoading(true)

    try {
      await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordSaved(true)
      setTimeout(() => setPasswordSaved(false), 3000)
    } catch (err) {
      setPasswordError(err.response?.data?.message || '비밀번호 변경에 실패했습니다.')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-bnf-blue/10 dark:bg-bnf-blue/20 flex items-center justify-center">
          <User className="w-5 h-5 text-bnf-blue dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-bnf-dark dark:text-white tracking-tight">내 프로필</h1>
          <p className="text-sm text-bnf-gray dark:text-gray-400 mt-1">계정 정보를 확인하고 수정할 수 있습니다</p>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-bnf-blue to-bnf-green rounded-full flex items-center justify-center">
            <span className="text-3xl font-display font-bold text-white">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-bnf-dark dark:text-white">{user?.name}</h2>
            <p className="text-bnf-gray dark:text-gray-400">{user?.email}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="badge badge-blue">{getRoleName(user?.role)}</span>
              {user?.companyName && (
                <span className="flex items-center gap-1 text-sm text-bnf-gray dark:text-gray-400">
                  <Building2 className="w-4 h-4" />
                  {user.companyName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'profile'
              ? 'bg-bnf-blue text-white'
              : 'bg-white dark:bg-gray-800 text-bnf-gray dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
        >
          기본 정보
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'password'
              ? 'bg-bnf-blue text-white'
              : 'bg-white dark:bg-gray-800 text-bnf-gray dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
        >
          비밀번호 변경
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 p-6 animate-fade-in">
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="label">이름</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input pl-12"
                    placeholder="이름 입력"
                  />
                </div>
              </div>

              <div>
                <label className="label">이메일</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    className="input pl-12"
                    placeholder="이메일 입력"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="label">전화번호</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="tel"
                    value={profileForm.phoneNumber}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    className="input pl-12"
                    placeholder="010-1234-5678"
                  />
                </div>
              </div>
            </div>

            {/* Read-only info */}
            <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div>
                <label className="label">회사</label>
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-bnf-gray dark:text-gray-400 border border-transparent dark:border-gray-700">
                  <Building2 className="w-5 h-5" />
                  {user?.companyName || '-'}
                </div>
              </div>

              <div>
                <label className="label">역할</label>
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-bnf-gray dark:text-gray-400 border border-transparent dark:border-gray-700">
                  <Shield className="w-5 h-5" />
                  {getRoleName(user?.role)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              {profileSaved && (
                <div className="flex items-center gap-2 text-green-600 animate-fade-in">
                  <CheckCircle className="w-5 h-5" />
                  저장되었습니다
                </div>
              )}
              {profileError && (
                <div className="flex items-center gap-2 text-red-600 animate-fade-in">
                  <AlertCircle className="w-5 h-5" />
                  {profileError}
                </div>
              )}
              <button type="submit" disabled={profileLoading} className="btn btn-primary ml-auto">
                {profileLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                저장
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 p-6 animate-fade-in">
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div>
              <label className="label">현재 비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="input pl-12 pr-12"
                  placeholder="현재 비밀번호"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">새 비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="input pl-12 pr-12"
                  placeholder="새 비밀번호 (8자 이상)"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">새 비밀번호 확인</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="input pl-12 pr-12"
                  placeholder="새 비밀번호 확인"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 text-red-600 animate-fade-in">
                <AlertCircle className="w-5 h-5" />
                {passwordError}
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              {passwordSaved && (
                <div className="flex items-center gap-2 text-green-600 animate-fade-in">
                  <CheckCircle className="w-5 h-5" />
                  비밀번호가 변경되었습니다
                </div>
              )}
              <button type="submit" disabled={passwordLoading} className="btn btn-primary ml-auto">
                {passwordLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                비밀번호 변경
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
