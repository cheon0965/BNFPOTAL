import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { requestsApi, attachmentsApi, erpSystemsApi } from '../../api'
import { CATEGORY_OPTIONS, PRIORITY, PRIORITY_LABELS } from '../../constants'
import { formatFileSize } from '../../utils'
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Paperclip,
  X,
  Upload,
  CheckCircle2,
  HelpCircle,
  FilePlus
} from 'lucide-react'
import RichTextEditor from '../../components/RichTextEditor'

// ─── 유효성 검사 및 폼 라이브러리 추가 ───
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ─── React Query 추가 ───
import { useQuery } from '@tanstack/react-query'

// 카테고리 옵션 (설명 포함)
const CATEGORY_OPTIONS_EXTENDED = [
  { value: 'QUESTION', label: '❓ 문의', description: '사용 방법이나 기능에 대한 질문' },
  { value: 'BUG', label: '🐛 버그', description: '오류나 예상치 못한 동작 신고' },
  { value: 'IMPROVEMENT', label: '✨ 개선요청', description: '기능 추가나 변경 요청' }
]

// 우선순위 옵션 (설명과 스타일 포함)
const PRIORITY_OPTIONS_EXTENDED = [
  { value: PRIORITY.LOW, label: PRIORITY_LABELS[PRIORITY.LOW], color: 'bg-gray-100 text-gray-600', description: '여유있게 처리' },
  { value: PRIORITY.MEDIUM, label: PRIORITY_LABELS[PRIORITY.MEDIUM], color: 'bg-blue-50 text-bnf-blue', description: '일반적인 처리' },
  { value: PRIORITY.HIGH, label: PRIORITY_LABELS[PRIORITY.HIGH], color: 'bg-orange-50 text-bnf-orange', description: '빠른 처리 필요' },
  { value: PRIORITY.CRITICAL, label: PRIORITY_LABELS[PRIORITY.CRITICAL], color: 'bg-red-50 text-red-600', description: '업무 중단 상황' }
]

// Zod 스키마 정의 (유효성 검사 규칙)
const schema = z.object({
  title: z.string().min(1, { message: '제목을 입력해주세요.' }).trim(),
  content: z.string().min(1, { message: '내용을 입력해주세요.' }).trim(),
  category: z.enum(['QUESTION', 'BUG', 'IMPROVEMENT']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  erpSystemId: z.string().min(1, { message: '대상 시스템을 선택해주세요.' })
})

export default function RequestCreatePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const erpSystemRef = useRef(null)

  // ─── React Hook Form 설정 ───
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      content: '',
      category: 'QUESTION',
      priority: PRIORITY.MEDIUM,
      erpSystemId: ''
    }
  })

  // 조건부 스타일링을 위한 선택값 관찰
  const selectedCategory = watch('category')
  const selectedPriority = watch('priority')

  const [files, setFiles] = useState([])
  const [globalError, setGlobalError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // React Query를 활용한 ERP 시스템 목록 조회 캐싱
  const { data: erpSystems = [], isLoading: isLoadingErpSystems } = useQuery({
    queryKey: ['erpSystems'],
    queryFn: async () => {
      const response = await erpSystemsApi.getAll()
      return response.data.map(sys => ({
        id: sys.erpSystemId,
        name: sys.version ? `${sys.name} ${sys.version}` : sys.name
      }))
    },
    staleTime: 1000 * 60 * 60 // 1시간 캐싱
  })

  const errorRef = useRef(null)

  useEffect(() => {
    if (globalError && errorRef?.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [globalError])

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files || [])
    addFiles(newFiles)
  }

  const addFiles = (newFiles) => {
    let hasInvalid = false
    const validFiles = newFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        hasInvalid = true
        return false
      }
      return true
    })

    if (hasInvalid) {
      setGlobalError('파일 크기는 10MB 이하여야 합니다.')
    } else if (validFiles.length > 0) {
      setGlobalError('')
    }

    if (validFiles.length === 0) return

    // 이미지 파일은 미리보기 URL을 포함한 객체로 변환
    const filesWithPreview = validFiles.map(file => {
      if (file.type && file.type.startsWith('image/')) {
        return {
          file,
          previewUrl: URL.createObjectURL(file)
        }
      }
      return {
        file,
        previewUrl: null
      }
    })

    setFiles(prev => [...prev, ...filesWithPreview])
  }

  const removeFile = (index) => {
    setFiles(prev => {
      const removed = prev[index]
      if (removed && removed.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl)
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files))
    }
  }


  // 컴포넌트 언마운트 시 미리보기 URL 정리
  useEffect(() => {
    return () => {
      files.forEach(f => {
        if (f && f.previewUrl) {
          URL.revokeObjectURL(f.previewUrl)
        }
      })
    }
  }, [])

  // React Hook Form의 handleSubmit이 호출하는 실제 제출 로직
  // 이미 유효성 통과한 데이터(data)만 넘어옴
  const onSubmit = async (data) => {
    setGlobalError('')
    setLoading(true)

    try {
      const payload = {
        title: data.title,
        content: data.content,
        category: data.category,
        priority: data.priority,
        erpSystemId: Number(data.erpSystemId)
      }

      const response = await requestsApi.create(payload)
      const createdRequest = response.data
      const requestId = createdRequest.requestId || createdRequest.id

      if (requestId && files.length > 0) {
        for (const fileWrapper of files) {
          if (fileWrapper && fileWrapper.file) {
            await attachmentsApi.upload(requestId, fileWrapper.file)
          }
        }
      }

      navigate('/requests')
    } catch (error) {
      console.error('요청 생성 실패:', error)
      setGlobalError('요청 생성 중 문제가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      {/* Back Button */}
      <Link
        to="/requests"
        className="inline-flex items-center gap-2 text-bnf-gray dark:text-gray-400 hover:text-bnf-dark dark:hover:text-gray-200 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        요청 목록으로
      </Link>

      <div className="card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-bnf-blue/10 dark:bg-bnf-blue/20 flex items-center justify-center">
              <FilePlus className="w-5 h-5 text-bnf-blue dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-bnf-dark dark:text-white tracking-tight">새 요청 작성</h1>
              <p className="text-sm text-bnf-gray dark:text-gray-400 mt-1">문의사항이나 요청사항을 등록해주세요.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {globalError && (
            <div ref={errorRef} className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-lg text-red-600 dark:text-red-400 text-sm animate-slide-down">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {globalError}
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="label">유형 *</label>
            <div className="grid sm:grid-cols-3 gap-3">
              {CATEGORY_OPTIONS_EXTENDED.map(option => (
                <label
                  key={option.value}
                  className={`
                    relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all
                    ${selectedCategory === option.value
                      ? 'border-bnf-blue bg-bnf-blue/5 dark:bg-bnf-blue/10 dark:border-bnf-blue/50 text-bnf-dark dark:text-white'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-bnf-dark dark:text-gray-300'
                    }
                  `}
                >
                  <input
                    type="radio"
                    value={option.value}
                    {...register('category')}
                    className="sr-only"
                  />
                  <span className="text-lg mb-1">{option.label}</span>
                  <span className={`text-xs ${selectedCategory === option.value ? 'text-bnf-blue dark:text-blue-300' : 'text-bnf-gray dark:text-gray-500'}`}>{option.description}</span>
                  {selectedCategory === option.value && (
                    <CheckCircle2 className="absolute top-3 right-3 w-5 h-5 text-bnf-blue dark:text-blue-400" />
                  )}
                </label>
              ))}
            </div>
            {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>}
          </div>

          {/* Priority Selection */}
          <div>
            <label className="label">우선순위 *</label>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS_EXTENDED.map(option => (
                <label
                  key={option.value}
                  className={`
                    inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all
                    ${selectedPriority === option.value
                      ? `border-current ${option.color}`
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-bnf-gray dark:text-gray-400'
                    }
                  `}
                >
                  <input
                    type="radio"
                    value={option.value}
                    {...register('priority')}
                    className="sr-only"
                  />
                  <span className="font-medium">{option.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-bnf-gray dark:text-gray-500 mt-2">
              {PRIORITY_OPTIONS_EXTENDED.find(p => p.value === selectedPriority)?.description}
            </p>
            {errors.priority && <p className="text-red-500 text-sm mt-1">{errors.priority.message}</p>}
          </div>

          {/* ERP System */}
          <div ref={erpSystemRef}>
            <label className="label">대상 시스템 *</label>
            <select
              {...register('erpSystemId')}
              className={`input ${errors.erpSystemId ? 'border-red-500 focus:ring-red-500' : ''}`}
            >
              <option value="">시스템 선택 (필수사항)</option>
              {isLoadingErpSystems ? (
                <option disabled>목록 불러오는 중...</option>
              ) : (
                erpSystems.map(sys => (
                  <option key={sys.id} value={sys.id}>{sys.name}</option>
                ))
              )}
            </select>
            {errors.erpSystemId && <p className="text-red-500 text-sm mt-1">{errors.erpSystemId.message}</p>}
          </div>

          {/* Title - RHF의 비제어 컴포넌트 방식 (타이핑 시 전체화면 리렌더링 제거) */}
          <div>
            <label className="label">제목 *</label>
            <input
              type="text"
              {...register('title')}
              className={`input bg-white dark:bg-gray-800 text-bnf-dark dark:text-gray-200 ${errors.title ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-bnf-blue/50 focus:border-bnf-blue'}`}
              placeholder="간단하고 명확한 제목을 입력해주세요"
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
          </div>

          {/* Content - Controller를 통한 써드파티 컴포넌트 연결 */}
          <div>
            <label className="label">내용 *</label>
            <Controller
              name="content"
              control={control}
              render={({ field: { onChange, value } }) => (
                <RichTextEditor
                  value={value}
                  onChange={onChange}
                  placeholder="문의 내용을 자세히 적어주세요.&#13;&#10;&#13;&#10;예시:&#13;&#10;- 현상: 어떤 문제가 발생하나요?&#13;&#10;- 발생 시점: 언제부터 발생했나요?&#13;&#10;- 재현 방법: 어떻게 하면 문제가 발생하나요?"
                  minHeight="500px"
                />
              )}
            />
            {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>}
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-bnf-gray dark:text-gray-500 flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                이미지를 복사하여 붙여넣거나 드래그하여 본문에 삽입할 수 있습니다.
              </p>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="label">첨부파일</label>
            <div
              className={`
                relative border-2 border-dashed rounded-xl p-8 text-center transition-all
                ${dragActive
                  ? 'border-bnf-blue bg-bnf-blue/5 dark:bg-bnf-blue/10 dark:border-bnf-blue/50'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-bnf-gray dark:text-gray-500" />
              <p className="text-bnf-gray dark:text-gray-400 mb-2">
                파일을 드래그하여 놓거나{' '}
                <label className="text-bnf-blue dark:text-blue-400 cursor-pointer hover:underline">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                  찾아보기
                </label>
              </p>
              <p className="text-xs text-bnf-gray dark:text-gray-500">최대 10MB, PNG, JPG, PDF, TXT 지원</p>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {/* Image Previews */}
                {files.some(f => f && f.previewUrl) && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {files.map((f, index) => (
                      f && f.previewUrl ? (
                        <div key={index} className="relative">
                          <img
                            src={f.previewUrl}
                            alt={f.file.name}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ) : null
                    ))}
                  </div>
                )}

                {/* Non-image file list */}
                {files.map((f, index) => (
                  !f || !f.previewUrl ? (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-transparent dark:border-gray-700"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Paperclip className="w-5 h-5 text-bnf-gray dark:text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-bnf-dark dark:text-gray-200 truncate">{f.file.name}</div>
                          <div className="text-xs text-bnf-gray dark:text-gray-500">{formatFileSize(f.file.size)}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-bnf-gray dark:text-gray-400" />
                      </button>
                    </div>
                  ) : null
                ))}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
            <Link to="/requests" className="btn btn-secondary">
              취소
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  등록 중...
                </>
              ) : (
                '요청 등록'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
