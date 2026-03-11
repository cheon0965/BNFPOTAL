import { useState, useEffect } from 'react'
import { emailSettingsApi } from '../../api'
import {
  Settings,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
  Lock
} from 'lucide-react'

export default function EmailSettingsPage() {
  const [host, setHost] = useState('')
  const [port, setPort] = useState(587)
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [fromAddress, setFromAddress] = useState('')
  const [enableSsl, setEnableSsl] = useState(true)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    const fetchSettings = async () => {
      try {
        setLoading(true)
        const response = await emailSettingsApi.get()
        if (!isMounted) return

        const data = response.data || {}

        setHost(data.host || '')
        setPort(data.port ?? 587)
        setUser(data.user || '')
        setPassword(data.password || '')
        setFromAddress(data.fromAddress || '')
        setEnableSsl(typeof data.enableSsl === 'boolean' ? data.enableSsl : true)
      } catch (err) {
        console.error('Failed to load email settings:', err)
        if (isMounted) {
          setError('메일 서버 설정을 불러오지 못했습니다.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchSettings()

    return () => {
      isMounted = false
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!host || !user || !password || !port) {
      setError('호스트, 포트, 사용자, 비밀번호는 필수 항목입니다.')
      return
    }

    const numericPort = Number(port)
    if (!Number.isFinite(numericPort) || numericPort <= 0) {
      setError('포트는 0보다 큰 숫자여야 합니다.')
      return
    }

    try {
      setSaving(true)

      await emailSettingsApi.update({
        host,
        port: numericPort,
        user,
        password,
        fromAddress,
        enableSsl
      })

      setSuccessMessage('메일 서버 설정이 저장되었습니다.')
    } catch (err) {
      console.error('Failed to save email settings:', err)
      setError('메일 서버 설정 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-bnf-orange/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-bnf-orange" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-bnf-dark dark:text-white tracking-tight">
            메일 서버 설정
          </h1>
          <p className="text-sm text-bnf-gray dark:text-gray-400 mt-1">
            알림 메일을 발송하기 위한 SMTP 서버 정보를 설정합니다.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-200">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-200 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3">
          <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mt-0.5" />
          <p className="text-sm text-emerald-600 dark:text-emerald-100">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)] gap-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-bnf-gray dark:text-gray-300" />
              <span className="ml-2 text-sm text-bnf-gray dark:text-gray-300">불러오는 중...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-bnf-dark dark:text-gray-300 mb-1.5">
                  SMTP 호스트
                </label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
                  placeholder="smtp.your-company.com"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-bnf-dark dark:text-gray-300 mb-1.5">
                    포트
                  </label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
                    placeholder="587"
                  />
                </div>
                <div className="flex items-center gap-2 mt-5 sm:mt-7">
                  <input
                    id="enableSsl"
                    type="checkbox"
                    checked={enableSsl}
                    onChange={(e) => setEnableSsl(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-bnf-orange focus:ring-bnf-orange bg-white dark:bg-gray-900/50 transition-colors"
                  />
                  <label
                    htmlFor="enableSsl"
                    className="text-xs font-medium text-bnf-dark dark:text-gray-300"
                  >
                    SSL 사용
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-bnf-dark dark:text-gray-300 mb-1.5">
                  사용자 (계정 아이디)
                </label>
                <input
                  type="text"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
                  placeholder="no-reply@your-company.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-bnf-dark dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  비밀번호
                  <Lock className="w-3 h-3 text-bnf-gray dark:text-gray-400" />
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
                  placeholder="SMTP 계정 비밀번호"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-bnf-dark dark:text-gray-300 mb-1.5">
                  발신자 이메일 (선택)
                </label>
                <input
                  type="email"
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
                  placeholder="비워두면 사용자(계정 이메일)로 발송됩니다."
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-bnf-orange px-4 py-3 text-sm font-medium text-white hover:bg-bnf-orange/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>저장 중...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>저장</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-bnf-orange" />
              <h2 className="text-xs font-semibold text-bnf-dark dark:text-gray-100">
                설정 안내
              </h2>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-bnf-gray dark:text-gray-400">
              <li>SMTP 호스트와 포트는 회사 메일 서버 정보에 맞게 입력하세요.</li>
              <li>SSL 사용 여부는 메일 서버 설정(예: 25/TLS, 465/SSL)에 맞춰 설정합니다.</li>
              <li>발신자 이메일을 비워두면 사용자(계정 이메일)로 발송됩니다.</li>
              <li>비밀번호는 평문으로 저장되므로, 관리자 계정 접근 권한을 제한하는 것을 권장합니다.</li>
              <li>설정 변경 후 실제 메일 발송이 잘 되는지 테스트해 보세요.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}