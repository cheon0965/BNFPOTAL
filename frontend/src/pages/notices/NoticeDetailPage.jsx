import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { noticesApi } from '../../api'
import { formatDateTime, formatFileSize } from '../../utils'
import {
  ArrowLeft,
  Megaphone,
  Pin,
  Eye,
  Calendar,
  User,
  Paperclip,
  Download,
  Image,
  FileText,
  X,
  ZoomIn,
  Loader2
} from 'lucide-react'

// 인증된 이미지 컴포넌트 - auth token으로 이미지 로드
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
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
        <Loader2 className="w-6 h-6 text-bnf-gray dark:text-gray-400 animate-spin" />
      </div>
    )
  }

  if (error || !imageSrc) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
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

export default function NoticeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [notice, setNotice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 이미지 미리보기 상태
  const [previewImage, setPreviewImage] = useState(null)

  useEffect(() => {
    fetchNotice()
  }, [id])

  const fetchNotice = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await noticesApi.getById(id)
      setNotice(response.data)
    } catch (err) {
      console.error('공지사항 조회 실패:', err)
      setError('공지사항을 찾을 수 없습니다.')
    } finally {
      setLoading(false)
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

  const isImageFile = (contentType) => {
    return contentType && contentType.startsWith('image/')
  }

  const getFileIcon = (contentType) => {
    if (isImageFile(contentType)) {
      return <Image className="w-4 h-4 text-bnf-blue dark:text-blue-400" />
    }
    return <FileText className="w-4 h-4 text-bnf-gray dark:text-gray-400" />
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-bnf-blue border-t-transparent rounded-full"></div>
        </div>
      </div>
    )
  }

  if (error || !notice) {
    return (
      <div className="animate-fade-in">
        <div className="card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 p-12 text-center">
          <Megaphone className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h2 className="text-xl font-semibold text-bnf-dark dark:text-white mb-2">공지사항을 찾을 수 없습니다</h2>
          <p className="text-bnf-gray dark:text-gray-400 mb-6">{error || '요청하신 공지사항이 존재하지 않습니다.'}</p>
          <Link to="/notices" className="btn btn-primary dark:bg-bnf-blue dark:hover:bg-blue-600 dark:text-white border-0">
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  // 이미지 첨부파일 분리
  const imageAttachments = notice.attachments?.filter(a => isImageFile(a.contentType)) || []
  const fileAttachments = notice.attachments?.filter(a => !isImageFile(a.contentType)) || []

  return (
    <div className="animate-fade-in">
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
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <Link
          to="/notices"
          className="inline-flex items-center gap-2 text-bnf-gray dark:text-gray-400 hover:text-bnf-dark dark:hover:text-gray-200 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </Link>
      </div>

      {/* Notice Content */}
      <div className="card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
        {/* Title Section */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            {notice.isPinned && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-bnf-orange/10 text-bnf-orange dark:text-orange-400 text-xs font-medium rounded-full">
                <Pin className="w-3 h-3" />
                고정 공지
              </span>
            )}
          </div>
          <h1 className="text-2xl font-display font-bold text-bnf-dark dark:text-white mb-4">
            {notice.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-bnf-gray dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {notice.createdBy?.name || '관리자'}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formatDateTime(notice.createdAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              조회 {notice.viewCount}
            </span>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6">
          <div className="prose dark:prose-invert max-w-none text-bnf-dark dark:text-gray-300 whitespace-pre-wrap">
            {notice.content}
          </div>
        </div>

        {/* Attachments Section */}
        {notice.attachments && notice.attachments.length > 0 && (
          <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="font-semibold text-bnf-dark dark:text-white mb-4 flex items-center gap-2">
              <Paperclip className="w-5 h-5" />
              첨부파일 ({notice.attachments.length})
            </h3>

            {/* Image Previews */}
            {imageAttachments.length > 0 && (
              <div className="mb-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {imageAttachments.map(attachment => (
                    <div key={attachment.attachmentId} className="relative group">
                      <AuthenticatedImage
                        noticeId={notice.noticeId}
                        attachmentId={attachment.attachmentId}
                        alt={attachment.fileName}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={async () => {
                          try {
                            const response = await noticesApi.downloadAttachment(notice.noticeId, attachment.attachmentId)
                            const url = URL.createObjectURL(new Blob([response.data]))
                            setPreviewImage(url)
                          } catch (err) {
                            console.error('이미지 로드 실패:', err)
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              const response = await noticesApi.downloadAttachment(notice.noticeId, attachment.attachmentId)
                              const url = URL.createObjectURL(new Blob([response.data]))
                              setPreviewImage(url)
                            } catch (err) {
                              console.error('이미지 로드 실패:', err)
                            }
                          }}
                          className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                          title="확대 보기"
                        >
                          <ZoomIn className="w-4 h-4 text-bnf-dark" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(attachment.attachmentId, attachment.fileName)
                          }}
                          className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                          title="다운로드"
                        >
                          <Download className="w-4 h-4 text-bnf-dark" />
                        </button>
                      </div>
                      <div className="mt-1 text-xs text-bnf-gray dark:text-gray-400 truncate">{attachment.fileName}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* File List */}
            {fileAttachments.length > 0 && (
              <div className="space-y-2">
                {fileAttachments.map(attachment => (
                  <div
                    key={attachment.attachmentId}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-bnf-blue dark:hover:border-bnf-blue hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors cursor-pointer group"
                    onClick={() => handleDownload(attachment.attachmentId, attachment.fileName)}
                  >
                    {getFileIcon(attachment.contentType)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-bnf-dark dark:text-gray-200 truncate">{attachment.fileName}</div>
                      <div className="text-xs text-bnf-gray dark:text-gray-500">{formatFileSize(attachment.fileSize)}</div>
                    </div>
                    <Download className="w-5 h-5 text-bnf-gray dark:text-gray-500 group-hover:text-bnf-blue dark:group-hover:text-blue-400 transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex justify-center">
        <Link to="/notices" className="btn btn-secondary dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </Link>
      </div>
    </div >
  )
}
