import { useEffect, useMemo, useState } from 'react'
import { emailTemplatesApi } from '../../api'
import {
  Mail,
  FileText,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info
} from 'lucide-react'

const TOKEN_DESCRIPTIONS = {
  '{UserName}': '수신자 이름',
  '{ResetLink}': '비밀번호 재설정 링크',
  '{RequestTitle}': '요청 제목',
  '{OldStatus}': '이전 상태',
  '{NewStatus}': '변경 상태',
  '{Reason}': '사유 또는 상세 메시지',
  '{RequestLink}': '요청 상세 링크',
  '{TaskTitle}': '업무 제목',
  '{Category}': '업무 분류',
  '{Priority}': '업무 우선순위',
  '{DueDate}': '업무 마감일',
  '{TaskLink}': '업무 상세 링크',
  '{NotificationMessage}': '알림 메시지 본문'
}

const TEMPLATE_TOKENS = {
  USER_PASSWORD_RESET: ['{UserName}', '{ResetLink}'],
  REQUEST_STATUS_CHANGED: ['{UserName}', '{RequestTitle}', '{OldStatus}', '{NewStatus}', '{Reason}', '{RequestLink}'],
  TASK_NOTIFICATION: ['{UserName}', '{TaskTitle}', '{Category}', '{Priority}', '{DueDate}', '{TaskLink}', '{NotificationMessage}'],
  REQUEST_ASSIGNED: ['{UserName}', '{RequestTitle}', '{RequestLink}'],
  NEW_COMMENT_RECEIVED: ['{UserName}', '{RequestTitle}', '{Reason}', '{RequestLink}']
}

const ALWAYS_ENABLED_TEMPLATE_KEYS = new Set(['USER_PASSWORD_RESET'])

const TEMPLATE_NAME_KO = {
  USER_PASSWORD_RESET: '비밀번호 재설정 안내',
  REQUEST_STATUS_CHANGED: '요청 상태 변경 알림',
  TASK_NOTIFICATION: '업무 알림',
  REQUEST_ASSIGNED: '요청 담당자 배정 알림',
  NEW_COMMENT_RECEIVED: '코멘트/보고 등록 알림'
}

export default function EmailTemplateListPage() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isEnabled, setIsEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    const fetchTemplates = async () => {
      try {
        setLoading(true)
        const response = await emailTemplatesApi.getAll()
        if (!isMounted) return

        const items = (response.data || []).map((item) =>
          ALWAYS_ENABLED_TEMPLATE_KEYS.has(item.templateKey)
            ? { ...item, isEnabled: true }
            : item
        )

        setTemplates(items)
        if (items.length > 0) {
          handleSelect(items[0])
        }
      } catch (err) {
        console.error('이메일 템플릿 조회 실패:', err)
        if (isMounted) {
          setError('이메일 템플릿을 불러오지 못했습니다.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchTemplates()

    return () => {
      isMounted = false
    }
  }, [])

  const handleSelect = (template) => {
    setSelectedTemplate(template)
    setSubject(template.subjectTemplate || '')
    setBody(template.bodyTemplate || '')
    setIsEnabled(
      ALWAYS_ENABLED_TEMPLATE_KEYS.has(template.templateKey)
        ? true
        : template.isEnabled !== false
    )
    setSuccessMessage('')
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedTemplate) return

    try {
      setSaving(true)
      setSuccessMessage('')
      setError('')

      const nextIsEnabled = ALWAYS_ENABLED_TEMPLATE_KEYS.has(selectedTemplate.templateKey)
        ? true
        : isEnabled

      await emailTemplatesApi.update(selectedTemplate.emailTemplateId, {
        subjectTemplate: subject,
        bodyTemplate: body,
        isEnabled: nextIsEnabled
      })

      const next = templates.map((t) =>
        t.emailTemplateId === selectedTemplate.emailTemplateId
          ? { ...t, subjectTemplate: subject, bodyTemplate: body, isEnabled: nextIsEnabled }
          : t
      )

      setTemplates(next)
      const selectedNext = next.find((t) => t.emailTemplateId === selectedTemplate.emailTemplateId)
      setSelectedTemplate(selectedNext || null)
      setSuccessMessage('저장되었습니다.')
    } catch (err) {
      console.error('이메일 템플릿 저장 실패:', err)
      setError('이메일 템플릿 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const availableTokens = useMemo(() => {
    if (!selectedTemplate) return []
    const keys = TEMPLATE_TOKENS[selectedTemplate.templateKey] || []
    return keys.map((key) => ({
      key,
      desc: TOKEN_DESCRIPTIONS[key] || '설명 없음'
    }))
  }, [selectedTemplate])

  const getTemplateDisplayName = (template) => {
    if (!template) return ''
    return TEMPLATE_NAME_KO[template.templateKey] || template.name || template.templateKey
  }

  const isEnableToggleLocked = ALWAYS_ENABLED_TEMPLATE_KEYS.has(selectedTemplate?.templateKey)

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-bnf-orange/10 flex items-center justify-center">
          <Mail className="w-5 h-5 text-bnf-orange" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-bnf-dark dark:text-white tracking-tight">메일 템플릿</h1>
          <p className="text-sm text-bnf-gray dark:text-gray-400 mt-1">
            템플릿별 발송 여부와 메일 내용을 관리합니다.
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

      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <FileText className="w-4 h-4 text-bnf-gray dark:text-gray-300" />
            <h2 className="text-sm font-semibold text-bnf-dark dark:text-white">템플릿 목록</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-bnf-gray dark:text-gray-300" />
              <span className="ml-2 text-sm text-bnf-gray dark:text-gray-300">불러오는 중...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="px-4 py-6 text-sm text-bnf-gray dark:text-gray-400">템플릿이 없습니다.</div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {templates.map((template) => {
                const isTemplateEnabled =
                  ALWAYS_ENABLED_TEMPLATE_KEYS.has(template.templateKey) || template.isEnabled !== false

                return (
                  <li key={template.emailTemplateId}>
                    <button
                      type="button"
                      onClick={() => handleSelect(template)}
                      className={`w-full text-left px-4 py-3 flex flex-col gap-1 transition-colors ${
                        selectedTemplate?.emailTemplateId === template.emailTemplateId
                          ? 'bg-gray-50 dark:bg-gray-700 border-l-2 border-bnf-orange'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <span className="text-sm font-medium text-bnf-dark dark:text-gray-100">{getTemplateDisplayName(template)}</span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-bnf-gray dark:text-gray-400 font-mono truncate">{template.templateKey}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            isTemplateEnabled
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                              : 'bg-gray-200 text-gray-600 dark:bg-gray-600/40 dark:text-gray-300'
                          }`}
                        >
                          {isTemplateEnabled ? '사용' : '중지'}
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg p-6">
          {selectedTemplate ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-bnf-dark dark:text-white">{getTemplateDisplayName(selectedTemplate)}</h2>
                  <p className="text-xs text-bnf-gray dark:text-gray-400 mt-1">
                    템플릿 키: <span className="font-mono text-bnf-gray dark:text-gray-300">{selectedTemplate.templateKey}</span>
                  </p>
                </div>
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

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr),260px]">
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-900/40">
                    <label className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-bnf-dark dark:text-gray-200">이메일 발송 사용</p>
                        <p className="text-xs text-bnf-gray dark:text-gray-400 mt-1">
                          {isEnableToggleLocked
                            ? '비밀번호 재설정 템플릿은 보안상 항상 발송되며 비활성화할 수 없습니다.'
                            : '비활성화하면 이 템플릿 기반 메일은 발송되지 않습니다.'}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => setIsEnabled(e.target.checked)}
                        disabled={isEnableToggleLocked}
                        className="h-4 w-4 rounded border-gray-300 text-bnf-orange focus:ring-bnf-orange/50"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-bnf-dark dark:text-gray-300 mb-1.5">제목</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-bnf-dark dark:text-gray-300 mb-1.5">본문</label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={14}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors font-mono resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="w-4 h-4 text-bnf-orange" />
                      <h3 className="text-xs font-semibold text-bnf-dark dark:text-white">사용 가능한 치환 변수</h3>
                    </div>
                    <ul className="space-y-1.5">
                      {availableTokens.length > 0 ? (
                        availableTokens.map((token) => (
                          <li key={token.key} className="flex flex-col">
                            <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-300">{token.key}</span>
                            <span className="text-[11px] text-bnf-gray dark:text-gray-400">{token.desc}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-[11px] text-bnf-gray dark:text-gray-400">이 템플릿에 대한 치환 변수 정보가 없습니다.</li>
                      )}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-gray-100 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-900/60 px-4 py-3 text-[11px] text-bnf-gray dark:text-gray-400 leading-relaxed">
                    <p className="mb-1 text-bnf-dark dark:text-gray-300 font-medium">안내</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>치환 변수는 메일 발송 시 실제 값으로 대체됩니다.</li>
                      <li>본문 줄바꿈은 HTML 메일 형식에 맞게 변환됩니다.</li>
                      <li>메일 발송 실패가 있어도 알림 저장 로직은 중단되지 않습니다.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-center h-full py-16 text-sm text-bnf-gray dark:text-gray-400">
              왼쪽 템플릿을 선택해 주세요.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
