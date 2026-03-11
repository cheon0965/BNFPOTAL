import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../api'
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuthStore()
  const resetSuccess = location.state?.resetSuccess

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      const response = await authApi.login(email, password)
      const { user, token } = response.data
      login(user, token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Mobile Logo */}
      <div className="lg:hidden flex justify-center mb-8">
        <img src="/logo.png" alt="BnF SOFT" className="h-16" />
      </div>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-bold text-bnf-dark">로그인</h2>
        <p className="text-bnf-gray mt-2">ERP 유지보수 포털에 오신 것을 환영합니다</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {resetSuccess && (
          <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 text-sm animate-slide-down">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해 주세요.
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm animate-slide-down">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div>
          <label className="label">이메일</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-12"
              placeholder="your@email.com"
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label className="label">비밀번호</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-12 pr-12"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-bnf-blue focus:ring-bnf-blue" />
            <span className="text-bnf-gray">로그인 상태 유지</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full py-3.5"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              로그인 중...
            </>
          ) : (
            '로그인'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-bnf-gray mt-6">
        아직 계정이 없으신가요?{' '}
        <Link to="/register" className="text-bnf-blue font-medium hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  )
}
