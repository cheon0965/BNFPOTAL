import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { noticesApi } from '../../api'
import { formatFileSize } from '../../utils'
import {
  ArrowLeft,
  Megaphone,
  Save,
  Pin,
  Eye,
  EyeOff,
  Paperclip,
  X,
  Image,
  FileText,
  Download,
  Trash2,
  Loader2,
  Upload,
  ZoomIn
} from 'lucide-react'

// 인증된 이미지 컴포넌트
function AuthenticatedImage({ noticeId, attachmentId, alt, className, onClick }) {
  const [imageSrc, setImageSrc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadImage = async () => {
      try {
        setLoading(true)
        setError(false)
        const response = await noticesApi.downloadAttachment(noticeId, attachmentId)
        if (isMounted) {
          const url = URL.createObjectURL(new Blob([response.data]))
          setImageSrc(url)
        }
      } catch (err) {
        console.error('Image load error:', err)
        if (isMounted) {
          setError(true)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadImage()

    return () => {
      isMounted = false
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc)
      }
    }
  }, [noticeId, attachmentId])

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800/80 ${className}`}>
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (error || !imageSrc) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800/80 ${className}`}>
        <Image className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
    )
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onClick={onClick}
    />
  )
}

export default function AdminNoticeFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    isPinned: false,
    isActive: true
  })
  const [existingAttachments, setExistingAttachments] = useState([])
  const [newFiles, setNewFiles] = useState([])
  const [attachmentsToDelete, setAttachmentsToDelete] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [previewImage, setPreviewImage] = useState(null)

  useEffect(() => {
    if (isEdit) {
      fetchNotice()
    }
  }, [id])

  const fetchNotice = async () => {
    try {
      setLoading(true)
      const response = await noticesApi.getById(id)
      const notice = response.data
      setFormData({
        title: notice.title,
        content: notice.content,
        isPinned: notice.isPinned,
        isActive: notice.isActive
      })
      setExistingAttachments(notice.attachments || [])
    } catch (error) {
      console.error('공지사항 조회 실패:', error)
      alert('공지사항을 찾을 수 없습니다.')
      navigate('/admin/notices')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // 에러 초기화
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name}: 파일 크기는 10MB 이하여야 합니다.`)
        return false
      }
      return true
    })

    const filesWithPreview = validFiles.map(file => {
      if (file.type.startsWith('image/')) {
        return {
          file,
          previewUrl: URL.createObjectURL(file)
        }
      }
      return { file, previewUrl: null }
    })

    setNewFiles(prev => [...prev, ...filesWithPreview])
  }

  const removeNewFile = (index) => {
    setNewFiles(prev => {
      const removed = prev[index]
      if (removed.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl)
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const markAttachmentForDeletion = (attachmentId) => {
    setAttachmentsToDelete(prev => [...prev, attachmentId])
    setExistingAttachments(prev => prev.filter(a => a.attachmentId !== attachmentId))
  }

  const isImageFile = (contentType) => {
    return contentType && contentType.startsWith('image/')
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.title.trim()) {
      newErrors.title = '제목을 입력해주세요.'
    }
    if (!formData.content.trim()) {
      newErrors.content = '내용을 입력해주세요.'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    try {
      setSaving(true)

      let noticeId = id

      if (isEdit) {
        // 수정
        await noticesApi.update(id, formData)

        // 삭제할 첨부파일 처리
        for (const attachmentId of attachmentsToDelete) {
          try {
            await noticesApi.deleteAttachment(id, attachmentId)
          } catch (err) {
            console.error('첨부파일 삭제 실패:', err)
          }
        }
      } else {
        // 새로 생성
        const response = await noticesApi.create(formData)
        noticeId = response.data.noticeId
      }

      // 새 첨부파일 업로드
      for (const { file } of newFiles) {
        try {
          await noticesApi.uploadAttachment(noticeId, file)
        } catch (err) {
          console.error('첨부파일 업로드 실패:', err)
        }
      }

      navigate('/admin/notices')
    } catch (error) {
      console.error('공지사항 저장 실패:', error)
      alert('공지사항 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async (attachmentId, fileName) => {
    try {
      const response = await noticesApi.downloadAttachment(id, attachmentId)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('파일 다운로드 실패:', err)
      alert('파일 다운로드에 실패했습니다.')
    }
  }

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      newFiles.forEach(nf => {
        if (nf.previewUrl) {
          URL.revokeObjectURL(nf.previewUrl)
        }
      })
    }
  }, [])

  if (loading) {
    return (
      <div className="p-6 animate-fade-in">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
        </div>
      </div>
    )
  }

  // 이미지 첨부파일 분리
  const existingImageAttachments = existingAttachments.filter(a => isImageFile(a.contentType))
  const existingFileAttachments = existingAttachments.filter(a => !isImageFile(a.contentType))

  return (
    <div className="p-6 animate-fade-in">
      {/* 이미지 미리보기 모달 */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            onClick={() => setPreviewImage(null)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={previewImage}
            alt="미리보기"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <Link
          to="/admin/notices"
          className="inline-flex items-center gap-2 text-bnf-gray dark:text-gray-400 hover:text-bnf-dark dark:hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </Link>
        <h1 className="text-2xl font-bold text-bnf-dark dark:text-white flex items-center gap-3">
          <Megaphone className="w-7 h-7 text-orange-400" />
          {isEdit ? '공지사항 수정' : '공지사항 등록'}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6 mb-6">
          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">
              제목 <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="공지사항 제목을 입력하세요"
              className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-xl text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors ${errors.title ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Content */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">
              내용 <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="공지사항 내용을 입력하세요"
              rows={12}
              className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-xl text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 resize-none transition-colors ${errors.content ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.content}</p>
            )}
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="isPinned"
                checked={formData.isPinned}
                onChange={handleChange}
                className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-bnf-orange focus:ring-bnf-orange bg-white dark:bg-gray-900/50 transition-colors"
              />
              <div className="flex items-center gap-2 text-bnf-dark dark:text-gray-300">
                <Pin className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                상단 고정
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-green-500 focus:ring-green-500 bg-white dark:bg-gray-900/50 transition-colors"
              />
              <div className="flex items-center gap-2 text-bnf-dark dark:text-gray-300">
                {formData.isActive ? (
                  <Eye className="w-4 h-4 text-green-500 dark:text-green-400" />
                ) : (
                  <EyeOff className="w-4 h-4 text-bnf-gray dark:text-gray-400" />
                )}
                {formData.isActive ? '공개' : '비공개'}
              </div>
            </label>
          </div>
        </div>

        {/* Attachments Section */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-bnf-dark dark:text-white mb-4 flex items-center gap-2">
            <Paperclip className="w-5 h-5 text-bnf-gray dark:text-gray-400" />
            첨부파일
          </h3>

          {/* Existing Image Attachments */}
          {existingImageAttachments.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-bnf-gray dark:text-gray-400 mb-2">이미지 파일</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {existingImageAttachments.map(attachment => (
                  <div key={attachment.attachmentId} className="relative group">
                    <AuthenticatedImage
                      noticeId={id}
                      attachmentId={attachment.attachmentId}
                      alt={attachment.fileName}
                      className="w-full h-24 object-cover rounded-lg cursor-pointer"
                      onClick={async () => {
                        try {
                          const response = await noticesApi.downloadAttachment(id, attachment.attachmentId)
                          const url = URL.createObjectURL(new Blob([response.data]))
                          setPreviewImage(url)
                        } catch (err) {
                          console.error('이미지 로드 실패:', err)
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const response = await noticesApi.downloadAttachment(id, attachment.attachmentId)
                            const url = URL.createObjectURL(new Blob([response.data]))
                            setPreviewImage(url)
                          } catch (err) {
                            console.error('이미지 로드 실패:', err)
                          }
                        }}
                        className="p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors"
                      >
                        <ZoomIn className="w-3 h-3 text-gray-700" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(attachment.attachmentId, attachment.fileName)}
                        className="p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors"
                      >
                        <Download className="w-3 h-3 text-gray-700" />
                      </button>
                      <button
                        type="button"
                        onClick={() => markAttachmentForDeletion(attachment.attachmentId)}
                        className="p-1.5 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                    <div className="mt-1 text-xs text-bnf-gray dark:text-gray-400 truncate">{attachment.fileName}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing File Attachments */}
          {existingFileAttachments.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-bnf-gray dark:text-gray-400 mb-2">첨부 파일</p>
              <div className="space-y-2">
                {existingFileAttachments.map(attachment => (
                  <div
                    key={attachment.attachmentId}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <div className="text-bnf-dark dark:text-white truncate">{attachment.fileName}</div>
                      <div className="text-xs text-bnf-gray dark:text-gray-400">{formatFileSize(attachment.fileSize)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownload(attachment.attachmentId, attachment.fileName)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => markAttachmentForDeletion(attachment.attachmentId)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Files Preview */}
          {newFiles.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-bnf-gray dark:text-gray-400 mb-2">새 첨부파일</p>
              {/* Image Previews */}
              {newFiles.some(nf => nf.previewUrl) && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
                  {newFiles.filter(nf => nf.previewUrl).map((nf, index) => (
                    <div key={index} className="relative">
                      <img
                        src={nf.previewUrl}
                        alt={nf.file.name}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                        onClick={() => setPreviewImage(nf.previewUrl)}
                      />
                      <button
                        type="button"
                        onClick={() => removeNewFile(newFiles.indexOf(nf))}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                      <div className="mt-1 text-xs text-bnf-gray dark:text-gray-400 truncate">{nf.file.name}</div>
                    </div>
                  ))}
                </div>
              )}
              {/* Non-image files */}
              {newFiles.filter(nf => !nf.previewUrl).map((nf, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-2"
                >
                  <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-bnf-dark dark:text-white truncate">{nf.file.name}</div>
                    <div className="text-xs text-bnf-gray dark:text-gray-400">{formatFileSize(nf.file.size)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNewFile(newFiles.indexOf(nf))}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          <label className="inline-flex items-center gap-2 btn btn-secondary rounded-xl transition-colors cursor-pointer">
            <Upload className="w-5 h-5" />
            파일 추가
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
          <p className="mt-2 text-xs text-bnf-gray dark:text-gray-500">
            최대 10MB, 허용 형식: 이미지, PDF, Office 문서, 텍스트, ZIP
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            to="/admin/notices"
            className="btn btn-secondary rounded-xl transition-colors"
          >
            취소
          </Link>
          <button
            type="submit"
            className="btn btn-warning"
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {isEdit ? '저장' : '등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
