import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { authApi } from '../../api'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Clock, ShieldX, Loader2 } from 'lucide-react'

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const token = searchParams.get('token')

    // 상태
    const [status, setStatus] = useState('loading') // loading, valid, expired, used, invalid, success, error
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    // 토큰 유효성 검증
    useEffect(() => {
        if (!token) {
            setStatus('invalid')
            return
        }

        const validate = async () => {
            try {
                const res = await authApi.validateResetToken(token)
                const { isValid, errorType } = res.data

                if (isValid) {
                    setStatus('valid')
                } else {
                    setStatus(errorType?.toLowerCase() || 'invalid')
                }
            } catch {
                setStatus('invalid')
            }
        }

        validate()
    }, [token])

    // 비밀번호 재설정 제출
    const handleSubmit = async (e) => {
        e.preventDefault()
        setErrorMessage('')

        if (password.length < 8) {
            setErrorMessage('비밀번호는 8자 이상이어야 합니다.')
            return
        }

        if (password !== confirmPassword) {
            setErrorMessage('비밀번호가 일치하지 않습니다.')
            return
        }

        setSubmitting(true)

        try {
            await authApi.resetPassword(token, password)
            setStatus('success')
            // 3초 후 로그인 페이지로 이동
            setTimeout(() => {
                navigate('/login', { state: { resetSuccess: true } })
            }, 3000)
        } catch (err) {
            const data = err.response?.data
            if (data?.errorType) {
                setStatus(data.errorType.toLowerCase())
            } else {
                setErrorMessage(data?.message || '비밀번호 재설정 중 오류가 발생했습니다.')
            }
        } finally {
            setSubmitting(false)
        }
    }

    // 로딩 상태
    if (status === 'loading') {
        return (
            <div className="animate-fade-in">
                <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-10 h-10 animate-spin text-bnf-blue mb-4" />
                    <p className="text-bnf-gray">링크를 확인하는 중...</p>
                </div>
            </div>
        )
    }

    // 성공 상태
    if (status === 'success') {
        return (
            <div className="animate-fade-in">
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-bnf-dark mb-3">
                        비밀번호가 변경되었습니다
                    </h2>
                    <p className="text-bnf-gray mb-6">
                        새 비밀번호로 로그인해 주세요.<br />
                        잠시 후 로그인 페이지로 이동합니다.
                    </p>
                    <Link
                        to="/login"
                        className="btn btn-primary inline-flex items-center gap-2 px-6 py-3"
                    >
                        로그인 페이지로 이동
                    </Link>
                </div>
            </div>
        )
    }

    // 에러 상태들
    if (status === 'expired' || status === 'used' || status === 'invalid') {
        const errorConfig = {
            expired: {
                icon: <Clock className="w-8 h-8 text-amber-500" />,
                bg: 'bg-amber-100',
                title: '비밀번호 재설정 링크가 만료되었습니다',
                desc: '이 링크는 24시간 동안만 유효합니다. 관리자에게 비밀번호 초기화를 다시 요청해 주세요.'
            },
            used: {
                icon: <CheckCircle className="w-8 h-8 text-gray-500" />,
                bg: 'bg-gray-100',
                title: '이미 사용된 링크입니다',
                desc: '이 비밀번호 재설정 링크는 이미 사용되었습니다. 추가 변경이 필요하면 관리자에게 문의해 주세요.'
            },
            invalid: {
                icon: <ShieldX className="w-8 h-8 text-red-500" />,
                bg: 'bg-red-100',
                title: '유효하지 않은 링크입니다',
                desc: '비밀번호 재설정 링크가 올바르지 않습니다. 관리자에게 비밀번호 초기화를 다시 요청해 주세요.'
            }
        }

        const config = errorConfig[status]

        return (
            <div className="animate-fade-in">
                <div className="text-center py-8">
                    <div className={`w-16 h-16 ${config.bg} rounded-full flex items-center justify-center mx-auto mb-6`}>
                        {config.icon}
                    </div>
                    <h2 className="text-2xl font-display font-bold text-bnf-dark mb-3">
                        {config.title}
                    </h2>
                    <p className="text-bnf-gray mb-6 leading-relaxed">
                        {config.desc}
                    </p>
                    <Link
                        to="/login"
                        className="btn btn-primary inline-flex items-center gap-2 px-6 py-3"
                    >
                        로그인 페이지로 이동
                    </Link>
                </div>
            </div>
        )
    }

    // 유효 상태 - 비밀번호 입력 폼
    return (
        <div className="animate-fade-in">
            <div className="lg:hidden flex justify-center mb-8">
                <img src="/logo.png" alt="BnF SOFT" className="h-16" />
            </div>

            <div className="text-center mb-8">
                <h2 className="text-2xl font-display font-bold text-bnf-dark">비밀번호 재설정</h2>
                <p className="text-bnf-gray mt-2">새로운 비밀번호를 입력해 주세요</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {errorMessage && (
                    <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm animate-slide-down">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        {errorMessage}
                    </div>
                )}

                <div>
                    <label className="label">새 비밀번호</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input pl-12 pr-12"
                            placeholder="8자 이상 입력해 주세요"
                            autoComplete="new-password"
                            minLength={8}
                            required
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

                <div>
                    <label className="label">비밀번호 확인</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="input pl-12 pr-12"
                            placeholder="비밀번호를 다시 입력해 주세요"
                            autoComplete="new-password"
                            minLength={8}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary w-full py-3.5"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            비밀번호 변경 중...
                        </>
                    ) : (
                        '비밀번호 변경'
                    )}
                </button>
            </form>

            <p className="text-center text-sm text-bnf-gray mt-6">
                <Link to="/login" className="text-bnf-blue font-medium hover:underline">
                    로그인 페이지로 돌아가기
                </Link>
            </p>
        </div>
    )
}
