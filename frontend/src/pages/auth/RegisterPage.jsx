import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { authApi, registrationCodesApi } from '../../api'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, User, KeyRound, CheckCircle2, Phone } from 'lucide-react'

export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const [formData, setFormData] = useState({
    registrationCode: searchParams.get('code') || '',
    email: '',
    name: '',
    phoneNumber: '',
    password: '',
    passwordConfirm: ''
  })

  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [termsError, setTermsError] = useState('')
  const [codeValidation, setCodeValidation] = useState({ valid: null, companyName: '' })
  const [validatingCode, setValidatingCode] = useState(false)

  // Validate registration code
  useEffect(() => {
    const validateCode = async () => {
      if (formData.registrationCode.length < 6) {
        setCodeValidation({ valid: null, companyName: '' })
        return
      }

      setValidatingCode(true)
      try {
        const response = await registrationCodesApi.validate(formData.registrationCode)
        setCodeValidation({
          valid: true,
          companyName: response.data.companyName
        })
      } catch (err) {
        setCodeValidation({
          valid: false,
          companyName: ''
        })
      } finally {
        setValidatingCode(false)
      }
    }

    const timeoutId = setTimeout(validateCode, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.registrationCode])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setTermsError('')

    // Validation
    if (!formData.registrationCode) {
      setError('등록 코드를 입력해주세요.')
      return
    }

    if (!formData.email || !formData.name || !formData.password) {
      setError('모든 필드를 입력해주세요.')
      return
    }

    if (formData.password !== formData.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (formData.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    if (!agreeTerms) {
      const msg = '이용약관에 동의해 주세요.'
      setError(msg)
      setTermsError(msg)
      return
    }

    setLoading(true)

    try {
      const response = await authApi.register({
        registrationCode: formData.registrationCode,
        email: formData.email,
        name: formData.name,
        phoneNumber: formData.phoneNumber || null,
        password: formData.password
      })

      const { user, token } = response.data
      login(user, token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || '회원가입에 실패했습니다. 등록 코드와 입력 정보를 확인해주세요.')
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
        <h2 className="text-2xl font-display font-bold text-bnf-dark">회원가입</h2>
        <p className="text-bnf-gray mt-2">등록 코드를 입력하여 계정을 생성하세요</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm animate-slide-down">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Registration Code */}
        <div>
          <label className="label">등록 코드 *</label>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              name="registrationCode"
              value={formData.registrationCode}
              onChange={handleChange}
              className={`input pl-12 pr-12 ${codeValidation.valid === true ? 'border-green-400 focus:border-green-400 focus:ring-green-200' :
                  codeValidation.valid === false ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : ''
                }`}
              placeholder="ABC123XYZ"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {validatingCode && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
              {!validatingCode && codeValidation.valid === true && (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              {!validatingCode && codeValidation.valid === false && (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
          </div>
          {codeValidation.valid === true && (
            <p className="mt-1.5 text-sm text-green-600">
              ✓ {codeValidation.companyName} 회사로 등록됩니다
            </p>
          )}
          {codeValidation.valid === false && (
            <p className="mt-1.5 text-sm text-red-500">
              유효하지 않거나 만료된 등록 코드입니다
            </p>
          )}
          <p className="mt-1.5 text-xs text-bnf-gray">
            유지보수 담당자로부터 받은 등록 코드를 입력해주세요
          </p>
        </div>

        {/* Email */}
        <div>
          <label className="label">이메일 *</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input pl-12"
              placeholder="your@email.com"
              autoComplete="email"
            />
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="label">이름 *</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input pl-12"
              placeholder="홍길동"
              autoComplete="name"
            />
          </div>
        </div>

        {/* Phone Number */}
        <div>
          <label className="label">전화번호</label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              className="input pl-12"
              placeholder="010-1234-5678"
              autoComplete="tel"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="label">비밀번호 *</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input pl-12 pr-12"
              placeholder="8자 이상 입력"
              autoComplete="new-password"
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

        {/* Password Confirm */}
        <div>
          <label className="label">비밀번호 확인 *</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="passwordConfirm"
              value={formData.passwordConfirm}
              onChange={handleChange}
              className={`input pl-12 ${formData.passwordConfirm && formData.password !== formData.passwordConfirm
                  ? 'border-red-400' : ''
                }`}
              placeholder="비밀번호 재입력"
              autoComplete="new-password"
            />
          </div>
          {formData.passwordConfirm && formData.password !== formData.passwordConfirm && (
            <p className="mt-1.5 text-sm text-red-500">비밀번호가 일치하지 않습니다</p>
          )}
        </div>

        {/* Terms of Service */}
        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 max-h-40 overflow-y-auto">
            <p className="text-xs text-bnf-gray">
              본 서비스는 비앤에프소프트에서 제공하는 ERP 유지보수 포털 서비스입니다. 회원 가입 후에는 서비스 이용과 관련된 안내가 이메일 등으로 발송될 수 있습니다.
            </p>
            <p className="mt-2 text-xs text-bnf-gray">
              서비스 이용약관 및 관련 정책은 언제든지 포털 화면 하단의 푸터 &quot;이용약관&quot;에서 전체 내용을 확인하실 수 있습니다.
            </p>
          </div>

          <label className="flex items-start gap-2 text-sm text-bnf-gray cursor-pointer select-none">
            <input
              type="checkbox"
              className={`mt-1 h-4 w-4 rounded border ${termsError ? 'border-red-400' : 'border-gray-300'} text-bnf-blue focus:ring-bnf-blue`}
              checked={agreeTerms}
              onChange={(e) => {
                setAgreeTerms(e.target.checked)
                setTermsError('')
                if (error === '이용약관에 동의해 주세요.') {
                  setError('')
                }
              }}
            />
            <span>
              <span className="font-medium text-bnf-dark">이용약관</span>을 확인하였으며 이에 동의합니다.
            </span>
          </label>
          {termsError && (
            <p className="mt-1.5 text-sm text-red-500">{termsError}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || codeValidation.valid === false}
          className="btn btn-primary w-full py-3.5"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              등록 중...
            </>
          ) : (
            '회원가입'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-bnf-gray mt-8">
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="text-bnf-blue font-medium hover:underline">
          로그인
        </Link>
      </p>
    </div>
  )
}
