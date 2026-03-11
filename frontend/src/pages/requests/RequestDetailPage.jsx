import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { requestsApi, commentsApi, attachmentsApi } from '../../api'
import { REQUEST_STATUS, STATUS_LABELS, CATEGORY_LABELS, PRIORITY, PRIORITY_LABELS, INTERNAL_ROLES, ROLE_LABELS } from '../../constants'
import { formatDateTime, formatFileSize } from '../../utils'
import { StatusBadge, PriorityBadge, CategoryLabel } from '../../components/common'
import {
  ArrowLeft,
  Calendar,
  User,
  Tag,
  Flag,
  MessageSquare,
  Paperclip,
  Send,
  MoreVertical,
  Clock,
  CheckCircle2,
  Edit3,
  Trash2,
  Download,
  Image,
  FileText,
  X,
  ZoomIn,
  Loader2,
  Phone,
  Building2
} from 'lucide-react'
import DOMPurify from 'dompurify'
import RichTextEditor from '../../components/RichTextEditor'

// Authenticated Image Component - loads image with auth token
function AuthenticatedImage({ requestId, attachmentId, alt, className, onClick }) {
  const [imageSrc, setImageSrc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadImage = async () => {
      try {
        setLoading(true)
        setError(false)
        const response = await attachmentsApi.download(requestId, attachmentId)
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
  }, [requestId, attachmentId])

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

export default function RequestDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [request, setRequest] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [commentFiles, setCommentFiles] = useState([])
  const [commentError, setCommentError] = useState('')

  // Image Preview State
  const [previewImage, setPreviewImage] = useState(null)

  // Edit/Delete State
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingContent, setEditingContent] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null) // commentId or 'request'

  // Request Edit State
  const [isEditingRequest, setIsEditingRequest] = useState(false)
  const [editingRequestData, setEditingRequestData] = useState({
    title: '',
    content: '',
    category: '',
    priority: ''
  })
  const [editingRequestAttachments, setEditingRequestAttachments] = useState([])
  const [editingRequestNewFiles, setEditingRequestNewFiles] = useState([])
  const [requestAttachmentsToDelete, setRequestAttachmentsToDelete] = useState([])

  // Assignee popup state
  const [assigneePopupOpen, setAssigneePopupOpen] = useState(false)
  const [assigneePopupPosition, setAssigneePopupPosition] = useState({ top: 0, left: 0 })
  const assigneeButtonRef = useRef(null)

  const handleAssigneeClick = () => {
    if (assigneeButtonRef.current) {
      const rect = assigneeButtonRef.current.getBoundingClientRect()
      setAssigneePopupPosition({
        top: rect.bottom + 8,
        left: Math.min(rect.left, window.innerWidth - 300)
      })
    }
    setAssigneePopupOpen(!assigneePopupOpen)
  }

  const handleCommentFileChange = (e) => {
    const newFiles = Array.from(e.target.files || [])
    if (newFiles.length === 0) return

    const validFiles = newFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        setCommentError('파일 크기는 10MB 이하여야 합니다.')
        return false
      }
      return true
    })

    if (validFiles.length > 0) {
      // Create preview URLs for images
      const filesWithPreview = validFiles.map(file => {
        if (file.type.startsWith('image/')) {
          return {
            file,
            previewUrl: URL.createObjectURL(file)
          }
        }
        return { file, previewUrl: null }
      })
      setCommentFiles(prev => [...prev, ...filesWithPreview])
    }
  }

  const removeCommentFile = (index) => {
    setCommentFiles(prev => {
      const removed = prev[index]
      if (removed.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl)
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      commentFiles.forEach(cf => {
        if (cf.previewUrl) {
          URL.revokeObjectURL(cf.previewUrl)
        }
      })
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [requestRes, commentsRes] = await Promise.all([
          requestsApi.getById(id),
          commentsApi.getByRequest(id)
        ])

        const r = requestRes.data

        const mappedRequest = {
          id: r.requestId,
          title: r.title,
          content: r.content,
          status: r.status,
          priority: r.priority,
          category: r.category,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          companyName: r.companyName || '',
          companyPhoneNumber: r.companyPhoneNumber || '',
          createdByUserId: r.createdBy?.userId,
          createdBy: r.createdBy ? {
            name: r.createdBy.name,
            email: r.createdBy.email,
            phoneNumber: r.createdBy.phoneNumber || ''
          } : null,
          assignedTo: r.assignedTo ? {
            name: r.assignedTo.name,
            email: r.assignedTo.email,
            phoneNumber: r.assignedTo.phoneNumber || '',
            role: r.assignedTo.role || ''
          } : null,
          erpSystem: {
            name: r.erpSystemName || 'ERP 시스템',
            version: r.erpSystemVersion || ''
          },
          attachments: (r.attachments || []).map(a => ({
            id: a.attachmentId,
            fileName: a.fileName,
            fileSize: a.fileSize,
            contentType: a.contentType || ''
          }))
        }

        setRequest(mappedRequest)

        const commentsData = commentsRes.data || []
        setComments(commentsData.map(c => ({
          id: c.commentId,
          userId: c.user?.userId,
          content: c.content,
          createdAt: c.createdAt,
          user: {
            name: c.user?.name || '',
            email: c.user?.email || '',
            role: c.user?.role || ''
          },
          isInternal: c.isInternal,
          attachments: (c.attachments || []).map(a => ({
            id: a.attachmentId,
            fileName: a.fileName,
            fileSize: a.fileSize,
            contentType: a.contentType || ''
          }))
        })))
      } catch (error) {
        console.error('요청 상세 조회 실패:', error)
      }
    }

    fetchData()
  }, [id])

  // 상태 순서 정의 (타임라인용)
  const STATUS_ORDER = [
    REQUEST_STATUS.SUBMITTED,
    REQUEST_STATUS.ASSIGNED,
    REQUEST_STATUS.IN_PROGRESS,
    REQUEST_STATUS.INTERIM_REPLIED,
    REQUEST_STATUS.COMPLETED
  ]

  // 처리 현황 타임라인 컴포넌트
  // 현재 상태(status)는 해당 단계가 완료됨을 의미함
  // 예: SUBMITTED = 전달 완료, 담당자 배정 진행 중
  // 예: ASSIGNED = 담당자 배정 완료, 처리중 진행 중
  const StatusTimeline = ({ status, createdAt, updatedAt }) => {
    const currentIndex = STATUS_ORDER.indexOf(status)

    const formatTimelineDate = (dateString) => {
      return new Date(dateString).toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    return (
      <div className="space-y-4">
        {STATUS_ORDER.map((s, index) => {
          // 현재 상태까지는 완료됨 (현재 상태 포함)
          const isCompleted = index <= currentIndex
          // 다음 단계가 현재 진행 중 (마지막 상태가 아닌 경우에만)
          const isInProgress = index === currentIndex + 1 && currentIndex < STATUS_ORDER.length - 1
          // 그 이후는 대기 중
          const isPending = index > currentIndex + 1

          // 완료 상태가 COMPLETED인 경우 모든 단계가 완료됨
          const allCompleted = status === 'COMPLETED'

          return (
            <div key={s}>
              <div className={`flex items-center gap-3 ${isPending && !allCompleted ? 'opacity-40' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCompleted || allCompleted ? 'bg-green-100' :
                  isInProgress ? 'bg-bnf-orange/10' :
                    'bg-gray-100'
                  }`}>
                  {isCompleted || allCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : isInProgress ? (
                    <Clock className="w-4 h-4 text-bnf-orange" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-bnf-dark">{STATUS_LABELS[s]}</div>
                  <div className="text-xs text-bnf-gray">
                    {/* 전달(SUBMITTED)은 요청 생성 시간 표시 */}
                    {index === 0 && isCompleted && formatTimelineDate(createdAt)}
                    {/* 완료된 다른 단계들은 updatedAt 표시 */}
                    {index > 0 && index <= currentIndex && formatTimelineDate(updatedAt)}
                    {/* 다음 단계는 현재 진행 중 */}
                    {isInProgress && !allCompleted && '현재 진행 중'}
                    {/* 그 이후는 대기 중 */}
                    {isPending && !allCompleted && '대기 중'}
                  </div>
                </div>
              </div>

              {index < STATUS_ORDER.length - 1 && (
                <div className={`ml-4 w-0.5 h-6 ${isCompleted || allCompleted ? 'bg-green-200' : 'bg-gray-200'}`}></div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    if (!request) return

    setCommentError('')
    setIsSubmitting(true)

    try {
      const response = await commentsApi.create(request.id, {
        content: newComment,
        isInternal: false
      })
      const created = response.data
      const newCommentId = created.commentId

      // 댓글 등록 후 첨부파일을 댓글에 연결하여 업로드
      const uploadedAttachments = []
      if (commentFiles.length > 0) {
        try {
          for (const cf of commentFiles) {
            const uploadRes = await attachmentsApi.uploadToComment(request.id, newCommentId, cf.file)
            uploadedAttachments.push({
              id: uploadRes.data.attachmentId,
              fileName: uploadRes.data.fileName,
              fileSize: uploadRes.data.fileSize,
              contentType: uploadRes.data.contentType || ''
            })
          }
        } catch (uploadError) {
          console.error('댓글 첨부 파일 업로드 실패:', uploadError)
        } finally {
          // Cleanup preview URLs
          commentFiles.forEach(cf => {
            if (cf.previewUrl) {
              URL.revokeObjectURL(cf.previewUrl)
            }
          })
          setCommentFiles([])
        }
      }

      // 화면에 즉시 댓글 반영 (첨부파일 포함)
      const mapped = {
        id: newCommentId,
        userId: user?.userId,
        content: created.content,
        createdAt: created.createdAt,
        user: {
          name: created.user?.name || user?.name || '',
          email: created.user?.email || user?.email || '',
          role: created.user?.role || user?.role || ''
        },
        isInternal: created.isInternal,
        attachments: uploadedAttachments
      }

      setComments(prev => [...prev, mapped])
      setNewComment('')
      setCommentFiles([])

      // Refresh request details to reflect potential status/assignee changes
      try {
        const requestRes = await requestsApi.getById(request.id)
        const r = requestRes.data
        const mappedRequest = {
          id: r.requestId,
          title: r.title,
          content: r.content,
          status: r.status,
          priority: r.priority,
          category: r.category,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          companyName: r.companyName || '',
          companyPhoneNumber: r.companyPhoneNumber || '',
          createdByUserId: r.createdBy?.userId,
          createdBy: r.createdBy ? {
            name: r.createdBy.name,
            email: r.createdBy.email,
            phoneNumber: r.createdBy.phoneNumber || ''
          } : null,
          assignedTo: r.assignedTo ? {
            name: r.assignedTo.name,
            email: r.assignedTo.email,
            phoneNumber: r.assignedTo.phoneNumber || '',
            role: r.assignedTo.role || ''
          } : null,
          erpSystem: {
            name: r.erpSystemName || 'ERP 시스템',
            version: r.erpSystemVersion || ''
          },
          attachments: (r.attachments || []).map(a => ({
            id: a.attachmentId,
            fileName: a.fileName,
            fileSize: a.fileSize,
            contentType: a.contentType || ''
          }))
        }
        setRequest(mappedRequest)
      } catch (err) {
        console.error('Failed to refresh request:', err)
      }
    } catch (error) {
      console.error('댓글 등록 실패:', error)
      setCommentError('댓글 등록에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Edit comment handlers
  const [editingAttachments, setEditingAttachments] = useState([]) // existing attachments
  const [editingNewFiles, setEditingNewFiles] = useState([]) // new files to add
  const [attachmentsToDelete, setAttachmentsToDelete] = useState([]) // IDs to delete

  const startEditComment = (comment) => {
    setEditingCommentId(comment.id)
    setEditingContent(comment.content)
    setEditingAttachments(comment.attachments || [])
    setEditingNewFiles([])
    setAttachmentsToDelete([])
  }

  const cancelEditComment = () => {
    setEditingCommentId(null)
    setEditingContent('')
    setEditingAttachments([])
    // Cleanup new file preview URLs
    editingNewFiles.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
    })
    setEditingNewFiles([])
    setAttachmentsToDelete([])
  }

  const handleEditFileChange = (e) => {
    const newFiles = Array.from(e.target.files || [])
    if (newFiles.length === 0) return

    const validFiles = newFiles.filter(file => file.size <= 10 * 1024 * 1024)
    if (validFiles.length > 0) {
      const filesWithPreview = validFiles.map(file => ({
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      }))
      setEditingNewFiles(prev => [...prev, ...filesWithPreview])
    }
  }

  const removeEditNewFile = (index) => {
    setEditingNewFiles(prev => {
      const removed = prev[index]
      if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  const markAttachmentForDelete = (attachmentId) => {
    setAttachmentsToDelete(prev => [...prev, attachmentId])
    setEditingAttachments(prev => prev.filter(a => a.id !== attachmentId))
  }

  const saveEditComment = async () => {
    if (!editingContent.trim() || !editingCommentId) return

    try {
      // Update comment content
      await commentsApi.update(request.id, editingCommentId, { content: editingContent })

      // Delete marked attachments
      for (const attachmentId of attachmentsToDelete) {
        try {
          await attachmentsApi.delete(request.id, attachmentId)
        } catch (err) {
          console.error('첨부파일 삭제 실패:', err)
        }
      }

      // Upload new files
      const uploadedAttachments = []
      for (const f of editingNewFiles) {
        try {
          const uploadRes = await attachmentsApi.uploadToComment(request.id, editingCommentId, f.file)
          uploadedAttachments.push({
            id: uploadRes.data.attachmentId,
            fileName: uploadRes.data.fileName,
            fileSize: uploadRes.data.fileSize,
            contentType: uploadRes.data.contentType || ''
          })
        } catch (err) {
          console.error('새 첨부파일 업로드 실패:', err)
        }
      }

      // Update comment state with new attachments
      setComments(prev => prev.map(c =>
        c.id === editingCommentId
          ? {
            ...c,
            content: editingContent,
            attachments: [...editingAttachments, ...uploadedAttachments]
          }
          : c
      ))
      cancelEditComment()
    } catch (error) {
      console.error('댓글 수정 실패:', error)
    }
  }

  // Delete comment handler
  const handleDeleteComment = async (commentId) => {
    try {
      await commentsApi.delete(request.id, commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
      setDeleteConfirm(null)
    } catch (error) {
      console.error('댓글 삭제 실패:', error)
    }
  }

  // Delete request handler
  const handleDeleteRequest = async () => {
    try {
      await requestsApi.delete(request.id)
      navigate('/requests')
    } catch (error) {
      console.error('요청 삭제 실패:', error)
    }
  }

  // Request edit handlers
  const startEditRequest = () => {
    setEditingRequestData({
      title: request.title,
      content: request.content,
      category: request.category,
      priority: request.priority
    })
    setEditingRequestAttachments(request.attachments || [])
    setEditingRequestNewFiles([])
    setRequestAttachmentsToDelete([])
    setIsEditingRequest(true)
  }

  const cancelEditRequest = () => {
    setIsEditingRequest(false)
    setEditingRequestData({ title: '', content: '', category: '', priority: '' })
    setEditingRequestAttachments([])
    editingRequestNewFiles.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
    })
    setEditingRequestNewFiles([])
    setRequestAttachmentsToDelete([])
  }

  const handleRequestEditFileChange = (e) => {
    const newFiles = Array.from(e.target.files || [])
    if (newFiles.length === 0) return

    const validFiles = newFiles.filter(file => file.size <= 10 * 1024 * 1024)
    if (validFiles.length > 0) {
      const filesWithPreview = validFiles.map(file => ({
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      }))
      setEditingRequestNewFiles(prev => [...prev, ...filesWithPreview])
    }
  }

  const removeRequestEditNewFile = (index) => {
    setEditingRequestNewFiles(prev => {
      const removed = prev[index]
      if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  const markRequestAttachmentForDelete = (attachmentId) => {
    setRequestAttachmentsToDelete(prev => [...prev, attachmentId])
    setEditingRequestAttachments(prev => prev.filter(a => a.id !== attachmentId))
  }

  const saveEditRequest = async () => {
    if (!editingRequestData.title.trim() || !editingRequestData.content.trim()) return

    try {
      // Update request data
      await requestsApi.update(request.id, editingRequestData)

      // Delete marked attachments
      for (const attachmentId of requestAttachmentsToDelete) {
        try {
          await attachmentsApi.delete(request.id, attachmentId)
        } catch (err) {
          console.error('첨부파일 삭제 실패:', err)
        }
      }

      // Upload new files
      const uploadedAttachments = []
      for (const f of editingRequestNewFiles) {
        try {
          const uploadRes = await attachmentsApi.upload(request.id, f.file)
          uploadedAttachments.push({
            id: uploadRes.data.attachmentId,
            fileName: uploadRes.data.fileName,
            fileSize: uploadRes.data.fileSize,
            contentType: uploadRes.data.contentType || ''
          })
        } catch (err) {
          console.error('새 첨부파일 업로드 실패:', err)
        }
      }

      setRequest(prev => ({
        ...prev,
        title: editingRequestData.title,
        content: editingRequestData.content,
        category: editingRequestData.category,
        priority: editingRequestData.priority,
        attachments: [...editingRequestAttachments, ...uploadedAttachments]
      }))
      cancelEditRequest()
    } catch (error) {
      console.error('요청 수정 실패:', error)
    }
  }

  // Check if current user is the author
  // Backend returns user.userId, not user.id
  const isRequestAuthor = user?.userId === request?.createdByUserId
  const isCommentAuthor = (comment) => {
    if (!user || !comment) return false
    const commentUserId = comment.userId ?? comment.user?.userId
    const commentEmail = comment.user?.email
    return (
      (user.userId != null && user.userId === commentUserId) ||
      (!!user.email && !!commentEmail && user.email === commentEmail)
    )
  }

  const getFileIcon = (contentType) => {
    if (contentType && contentType.startsWith('image/')) {
      return <Image className="w-5 h-5 text-bnf-blue dark:text-blue-400" />
    }
    return <FileText className="w-5 h-5 text-bnf-gray dark:text-gray-400" />
  }

  const isImageFile = (contentType) => {
    return contentType && contentType.startsWith('image/')
  }

  const handleDownload = async (attachmentId, fileName) => {
    try {
      const response = await attachmentsApi.download(request.id, attachmentId)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('파일 다운로드 실패:', error)
    }
  }

  const openImagePreview = (attachmentId) => {
    setPreviewImage(attachmentId)
  }

  const closeImagePreview = () => {
    setPreviewImage(null)
  }

  if (!request) {
    return (
      <div className="animate-fade-in">
        <p className="text-bnf-gray dark:text-gray-400">요청 정보를 불러오는 중입니다...</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closeImagePreview}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            onClick={closeImagePreview}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <AuthenticatedImage
            requestId={request.id}
            attachmentId={previewImage}
            alt="미리보기"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Back Button */}
      <Link
        to="/requests"
        className="inline-flex items-center gap-2 text-bnf-gray dark:text-gray-400 hover:text-bnf-dark dark:hover:text-gray-200 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        요청 목록으로
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Header */}
          <div className="card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 p-6">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <StatusBadge status={request.status} />
              <PriorityBadge priority={request.priority} />
              <CategoryLabel category={request.category} />
              <div className="flex items-center gap-1 ml-auto">
                {/* Small edit/delete icons for author when no comments */}
                {isRequestAuthor && comments.length === 0 && !isEditingRequest && (
                  <>
                    <button
                      onClick={startEditRequest}
                      className="p-1 text-bnf-gray hover:text-bnf-blue transition-colors"
                      title="수정"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm('request')}
                      className="p-1 text-red-400 hover:text-red-600 transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <span className="text-sm text-bnf-gray">#{request.id}</span>
              </div>
            </div>

            {/* Request Delete Confirmation */}
            {deleteConfirm === 'request' && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/30">
                <p className="text-sm text-red-600 dark:text-red-400 mb-3">⚠️ 정말 이 요청을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="btn btn-ghost text-sm"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleDeleteRequest}
                    className="btn btn-danger text-sm rounded-lg transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>
            )}

            {/* Edit Mode */}
            {isEditingRequest ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-bnf-dark mb-1">제목</label>
                  <input
                    type="text"
                    value={editingRequestData.title}
                    onChange={(e) => setEditingRequestData(prev => ({ ...prev, title: e.target.value }))}
                    className="input w-full"
                    placeholder="제목을 입력하세요"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-bnf-dark mb-1">카테고리</label>
                    <select
                      value={editingRequestData.category}
                      onChange={(e) => setEditingRequestData(prev => ({ ...prev, category: e.target.value }))}
                      className="input w-full"
                    >
                      <option value="BUG">🐛 버그</option>
                      <option value="QUESTION">❓ 문의</option>
                      <option value="IMPROVEMENT">✨ 개선요청</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-bnf-dark mb-1">우선순위</label>
                    <select
                      value={editingRequestData.priority}
                      onChange={(e) => setEditingRequestData(prev => ({ ...prev, priority: e.target.value }))}
                      className="input w-full"
                    >
                      <option value="LOW">낮음</option>
                      <option value="MEDIUM">보통</option>
                      <option value="HIGH">높음</option>
                      <option value="CRITICAL">긴급</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-bnf-dark mb-1">내용</label>
                  <RichTextEditor
                    value={editingRequestData.content}
                    onChange={(content) => setEditingRequestData(prev => ({ ...prev, content }))}
                    placeholder="내용을 입력하세요"
                    minHeight="200px"
                  />
                </div>

                {/* Attachment Management */}
                <div className="border-t border-gray-100 pt-4">
                  <label className="block text-sm font-medium text-bnf-dark mb-2">첨부파일</label>

                  {/* Existing Attachments */}
                  {editingRequestAttachments.length > 0 && (
                    <div className="space-y-1 mb-3">
                      <div className="text-xs text-bnf-gray">기존 첨부파일</div>
                      {editingRequestAttachments.map(file => (
                        <div
                          key={file.id}
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded-md text-sm"
                        >
                          {getFileIcon(file.contentType)}
                          <span className="flex-1 truncate text-bnf-dark">{file.fileName}</span>
                          <span className="text-xs text-bnf-gray">{formatFileSize(file.fileSize)}</span>
                          <button
                            type="button"
                            onClick={() => markRequestAttachmentForDelete(file.id)}
                            className="p-1 text-red-400 hover:text-red-600 rounded transition-colors"
                            title="첨부파일 삭제"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* New Files to Add */}
                  {editingRequestNewFiles.length > 0 && (
                    <div className="space-y-1 mb-3">
                      <div className="text-xs text-bnf-gray">새로 추가할 파일</div>
                      {editingRequestNewFiles.some(f => f.previewUrl) && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {editingRequestNewFiles.filter(f => f.previewUrl).map((f, idx) => (
                            <div key={idx} className="relative">
                              <img
                                src={f.previewUrl}
                                alt={f.file.name}
                                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                              />
                              <button
                                type="button"
                                onClick={() => removeRequestEditNewFile(editingRequestNewFiles.indexOf(f))}
                                className="absolute -top-1 -right-1 p-0.5 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {editingRequestNewFiles.filter(f => !f.previewUrl).map((f, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 bg-blue-50 rounded-md text-sm"
                        >
                          <Paperclip className="w-4 h-4 text-bnf-blue" />
                          <span className="flex-1 truncate text-bnf-dark">{f.file.name}</span>
                          <span className="text-xs text-bnf-gray">{formatFileSize(f.file.size)}</span>
                          <button
                            type="button"
                            onClick={() => removeRequestEditNewFile(editingRequestNewFiles.indexOf(f))}
                            className="p-1 text-red-400 hover:text-red-600 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-bnf-gray hover:text-bnf-blue hover:bg-blue-50 rounded-lg cursor-pointer transition-colors border border-dashed border-gray-300">
                    <Paperclip className="w-4 h-4" />
                    <span>파일 추가</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                      onChange={handleRequestEditFileChange}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={cancelEditRequest}
                    className="btn btn-ghost"
                  >
                    취소
                  </button>
                  <button
                    onClick={saveEditRequest}
                    className="btn btn-primary"
                    disabled={!editingRequestData.title.trim() || !editingRequestData.content.trim()}
                  >
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-display font-bold text-bnf-dark dark:text-white mb-4">
                  {request.title}
                </h1>

                <div
                  className="prose dark:prose-invert max-w-none text-bnf-dark dark:text-gray-300 ql-editor px-0 pb-0 break-words whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(request.content) }}
                />
              </>
            )}

            {/* Attachments - hide when editing */}
            {!isEditingRequest && request.attachments.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                <h3 className="flex items-center gap-2 text-sm font-medium text-bnf-dark dark:text-gray-200 mb-3">
                  <Paperclip className="w-4 h-4" />
                  첨부파일 ({request.attachments.length})
                </h3>

                {/* Image Previews Grid */}
                {request.attachments.some(f => isImageFile(f.contentType)) && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    {request.attachments.filter(f => isImageFile(f.contentType)).map(file => (
                      <div
                        key={file.id}
                        className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
                        onClick={() => openImagePreview(file.id)}
                      >
                        <AuthenticatedImage
                          requestId={request.id}
                          attachmentId={file.id}
                          alt={file.fileName}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <ZoomIn className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* File List */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {request.attachments.map(file => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 border border-transparent dark:border-gray-700 transition-colors cursor-pointer group"
                      onClick={() => handleDownload(file.id, file.fileName)}
                    >
                      {getFileIcon(file.contentType)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-bnf-dark dark:text-gray-200 truncate">{file.fileName}</div>
                        <div className="text-xs text-bnf-gray dark:text-gray-500">{formatFileSize(file.fileSize)}</div>
                      </div>
                      <Download className="w-4 h-4 text-bnf-gray dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-bnf-blue/5 via-bnf-green/5 to-transparent dark:from-bnf-blue/10 dark:via-bnf-green/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-display font-semibold text-bnf-dark dark:text-white">
                    <MessageSquare className="w-5 h-5" />
                    요청 답변
                  </h2>
                  <p className="mt-1 text-xs text-bnf-gray dark:text-gray-400">
                    고객 요청에 대한 질문과 답변을 이곳에서 주고받을 수 있습니다.
                  </p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/80 dark:bg-gray-700/80 border border-gray-100 dark:border-gray-600 text-xs text-bnf-gray dark:text-gray-300">
                  전체 <span className="mx-1 font-semibold text-bnf-dark dark:text-white">{comments.length}</span>개
                </span>
              </div>
            </div>

            {/* Comments List */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {comments.length === 0 ? (
                <div className="p-6 text-center text-bnf-gray dark:text-gray-500">
                  아직 답변이 없습니다. 첫 응답을 남겨보세요.
                </div>
              ) : (
                comments.map((comment, index) => (
                  <div
                    key={comment.id}
                    className="p-6 animate-slide-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div
                      className={`flex items-start gap-4 ${comment.user?.role && INTERNAL_ROLES.includes(comment.user.role)
                        ? 'flex-row-reverse'
                        : ''
                        }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm
                          ${comment.user?.role && INTERNAL_ROLES.includes(comment.user.role)
                            ? 'bg-bnf-blue/10 dark:bg-bnf-blue/20 text-bnf-blue dark:text-blue-400'
                            : 'bg-bnf-orange/10 dark:bg-bnf-orange/20 text-bnf-orange dark:text-orange-400'
                          }`}
                      >
                        <span className="font-medium">

                          {comment.user?.name ? comment.user.name.charAt(0) : '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-bnf-dark dark:text-gray-200">{comment.user?.name || '알 수 없음'}</span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium
                                ${(comment.user?.role && INTERNAL_ROLES.includes(comment.user.role))
                                  ? 'bg-bnf-blue/10 dark:bg-bnf-blue/20 text-bnf-blue dark:text-blue-400'
                                  : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'}`}
                            >
                              {(comment.user?.role && INTERNAL_ROLES.includes(comment.user.role))
                                ? 'BNF 답변'
                                : '고객 메모'}
                            </span>
                            <span className="text-xs text-bnf-gray dark:text-gray-500">{formatDateTime(comment.createdAt)}</span>
                          </div>
                          {/* Edit/Delete buttons for author */}
                          {isCommentAuthor(comment) && editingCommentId !== comment.id && index === comments.length - 1 && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => startEditComment(comment)}
                                className="p-1.5 text-bnf-gray dark:text-gray-500 hover:text-bnf-blue dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                title="수정"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(comment.id)}
                                className="p-1.5 text-bnf-gray dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                title="삭제"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Edit mode */}
                        <div
                          className={`mt-1 rounded-2xl px-4 py-3 shadow-sm border 
                            ${comment.user?.role && INTERNAL_ROLES.includes(comment.user.role)
                              ? 'bg-bnf-blue/5 dark:bg-bnf-blue/10 border-bnf-blue/20 dark:border-bnf-blue/30'
                              : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                            }`}
                        >
                          {editingCommentId === comment.id ? (
                            <div className="space-y-3">
                              <textarea
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                className="input resize-none min-h-[80px] w-full"
                                rows={3}
                              />

                              {/* Existing Attachments */}
                              {editingAttachments.length > 0 && (
                                <div className="space-y-1">
                                  <div className="text-xs text-bnf-gray font-medium">기존 첨부파일</div>
                                  {editingAttachments.map(file => (
                                    <div
                                      key={file.id}
                                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-md text-sm"
                                    >
                                      {getFileIcon(file.contentType)}
                                      <span className="flex-1 truncate text-bnf-dark">{file.fileName}</span>
                                      <span className="text-xs text-bnf-gray">{formatFileSize(file.fileSize)}</span>
                                      <button
                                        type="button"
                                        onClick={() => markAttachmentForDelete(file.id)}
                                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="첨부파일 삭제"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* New Files to Add */}
                              {editingNewFiles.length > 0 && (
                                <div className="space-y-1">
                                  <div className="text-xs text-bnf-gray font-medium">새로 추가할 파일</div>
                                  {editingNewFiles.some(f => f.previewUrl) && (
                                    <div className="flex flex-wrap gap-2 mb-2">
                                      {editingNewFiles.filter(f => f.previewUrl).map((f, idx) => (
                                        <div key={idx} className="relative">
                                          <img
                                            src={f.previewUrl}
                                            alt={f.file.name}
                                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => removeEditNewFile(editingNewFiles.indexOf(f))}
                                            className="absolute -top-1 -right-1 p-0.5 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                                          >
                                            <X className="w-3 h-3 text-white" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {editingNewFiles.filter(f => !f.previewUrl).map((f, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-2 p-2 bg-blue-50 rounded-md text-sm"
                                    >
                                      <Paperclip className="w-4 h-4 text-bnf-blue" />
                                      <span className="flex-1 truncate text-bnf-dark">{f.file.name}</span>
                                      <span className="text-xs text-bnf-gray">{formatFileSize(f.file.size)}</span>
                                      <button
                                        type="button"
                                        onClick={() => removeEditNewFile(editingNewFiles.indexOf(f))}
                                        className="p-1 text-red-400 hover:text-red-600 rounded transition-colors"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center justify-between">
                                <label className="flex items-center gap-1 px-3 py-1.5 text-sm text-bnf-gray hover:text-bnf-blue hover:bg-blue-50 rounded-lg cursor-pointer transition-colors">
                                  <Paperclip className="w-4 h-4" />
                                  <span>파일 추가</span>
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                                    onChange={handleEditFileChange}
                                    className="sr-only"
                                  />
                                </label>
                                <div className="flex gap-2">
                                  <button
                                    onClick={cancelEditComment}
                                    className="btn btn-ghost text-sm"
                                  >
                                    취소
                                  </button>
                                  <button
                                    onClick={saveEditComment}
                                    className="btn btn-primary text-sm"
                                    disabled={!editingContent.trim()}
                                  >
                                    저장
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-bnf-dark dark:text-gray-300 whitespace-pre-wrap">
                              {comment.content}
                            </div>
                          )}

                          {/* Delete Confirm Modal */}
                          {deleteConfirm === comment.id && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/30">
                              <p className="text-sm text-red-600 dark:text-red-400 mb-2">정말 이 댓글을 삭제하시겠습니까?</p>
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="btn btn-ghost text-sm"
                                >
                                  취소
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="btn btn-danger text-sm rounded-lg transition-colors"
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          )}

                        </div>                        {/* Comment Attachments - hide when editing this comment */}
                        {editingCommentId !== comment.id && comment.attachments && comment.attachments.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            {/* Image Previews */}
                            {comment.attachments.some(a => isImageFile(a.contentType)) && (
                              <div className="flex flex-wrap gap-2 mb-2">
                                {comment.attachments.filter(a => isImageFile(a.contentType)).map(file => (
                                  <div
                                    key={file.id}
                                    className="relative w-24 h-24 bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
                                    onClick={() => openImagePreview(file.id)}
                                  >
                                    <AuthenticatedImage
                                      requestId={request.id}
                                      attachmentId={file.id}
                                      alt={file.fileName}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                      <ZoomIn className="w-5 h-5 text-white" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* File List */}
                            <div className="space-y-1">
                              {comment.attachments.map(file => (
                                <div
                                  key={file.id}
                                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors cursor-pointer group text-sm"
                                  onClick={() => handleDownload(file.id, file.fileName)}
                                >
                                  {getFileIcon(file.contentType)}
                                  <span className="flex-1 truncate text-bnf-dark">{file.fileName}</span>
                                  <span className="text-xs text-bnf-gray">{formatFileSize(file.fileSize)}</span>
                                  <Download className="w-4 h-4 text-bnf-gray opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* New Comment Form */}
            <form onSubmit={handleSubmitComment} className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-bnf-blue rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-medium">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="요청에 대한 답변이나 메모를 입력하세요..."
                    className="input resize-none min-h-[100px]"
                    rows={3}
                  />
                  {/* Comment Error */}
                  {commentError && (
                    <p className="mt-2 text-xs text-red-500">{commentError}</p>
                  )}

                  {/* Comment File Previews */}
                  {commentFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {/* Image Previews */}
                      {commentFiles.some(cf => cf.previewUrl) && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {commentFiles.filter(cf => cf.previewUrl).map((cf, index) => (
                            <div key={index} className="relative">
                              <img
                                src={cf.previewUrl}
                                alt={cf.file.name}
                                className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                              />
                              <button
                                type="button"
                                onClick={() => removeCommentFile(commentFiles.indexOf(cf))}
                                className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Non-image file list */}
                      {commentFiles.filter(cf => !cf.previewUrl).map((cf, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-100 rounded-md"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Paperclip className="w-4 h-4 text-bnf-gray flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-bnf-dark truncate">{cf.file.name}</div>
                              <div className="text-[11px] text-bnf-gray">{formatFileSize(cf.file.size)}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCommentFile(commentFiles.indexOf(cf))}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            <X className="w-3 h-3 text-bnf-gray" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <label className="btn btn-ghost text-sm cursor-pointer">
                      <Paperclip className="w-4 h-4" />
                      <span className="ml-1">파일 첨부</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                        onChange={handleCommentFileChange}
                        className="sr-only"
                      />
                    </label>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting || !newComment.trim()}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      등록
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Request Info */}
          <div className="card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 p-6 overflow-visible">
            <h3 className="font-semibold text-bnf-dark dark:text-white mb-4">요청 정보</h3>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-bnf-gray dark:text-gray-400" />
                <div>
                  <div className="text-xs text-bnf-gray dark:text-gray-400">등록일</div>
                  <div className="text-sm text-bnf-dark dark:text-gray-200">{formatDateTime(request.createdAt)}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-bnf-gray dark:text-gray-400" />
                <div>
                  <div className="text-xs text-bnf-gray dark:text-gray-400">최근 업데이트</div>
                  <div className="text-sm text-bnf-dark dark:text-gray-200">{formatDateTime(request.updatedAt)}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-bnf-gray dark:text-gray-400" />
                <div>
                  <div className="text-xs text-bnf-gray dark:text-gray-400">회사</div>
                  <div className="text-sm text-bnf-dark dark:text-gray-200">
                    {request.companyName || '알 수 없음'}
                    {request.companyPhoneNumber && (
                      <span className="ml-2 text-bnf-gray dark:text-gray-500">({request.companyPhoneNumber})</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-bnf-gray dark:text-gray-400" />
                <div>
                  <div className="text-xs text-bnf-gray dark:text-gray-400">작성자</div>
                  <div className="text-sm text-bnf-dark dark:text-gray-200">
                    {request.createdBy?.name || '알 수 없음'}
                    {request.createdBy?.phoneNumber && (
                      <span className="ml-2 text-bnf-gray dark:text-gray-500">({request.createdBy.phoneNumber})</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-bnf-blue dark:text-blue-400" />
                <div>
                  <div className="text-xs text-bnf-gray dark:text-gray-400">담당자</div>
                  {request.assignedTo ? (
                    <div className="relative">
                      <button
                        ref={assigneeButtonRef}
                        onClick={() => setAssigneePopupOpen(!assigneePopupOpen)}
                        className="text-sm text-bnf-blue font-medium hover:underline cursor-pointer flex items-center gap-1"
                      >
                        {request.assignedTo.name}
                        {request.assignedTo.phoneNumber && (
                          <span className="text-bnf-gray font-normal">({request.assignedTo.phoneNumber})</span>
                        )}
                      </button>

                      {/* Assignee Popup */}
                      {assigneePopupOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setAssigneePopupOpen(false)}
                          />
                          <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-elevated border border-gray-100 dark:border-gray-700 p-4 z-50 animate-scale-in">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-12 h-12 bg-bnf-blue/10 dark:bg-bnf-blue/20 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-bnf-blue dark:text-blue-400" />
                              </div>
                              <div>
                                <div className="font-semibold text-bnf-dark dark:text-gray-200">{request.assignedTo.name}</div>
                                <div className="text-xs text-bnf-blue dark:text-blue-400">
                                  {ROLE_LABELS[request.assignedTo.role] || request.assignedTo.role || '담당자'}
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-bnf-gray dark:text-gray-400">
                                <span className="font-medium text-bnf-dark dark:text-gray-300 min-w-[50px]">이메일</span>
                                {/* Mobile Link */}
                                <a
                                  href={`mailto:${request.assignedTo.email}`}
                                  className="text-bnf-blue dark:text-blue-400 hover:underline truncate sm:hidden block"
                                >
                                  {request.assignedTo.email || '-'}
                                </a>
                                {/* Desktop Span */}
                                <span className="text-bnf-dark dark:text-gray-300 truncate hidden sm:block">
                                  {request.assignedTo.email || '-'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-bnf-gray dark:text-gray-400">
                                <span className="font-medium text-bnf-dark dark:text-gray-300 min-w-[50px]">전화</span>
                                {request.assignedTo.phoneNumber ? (
                                  <>
                                    {/* Mobile Link */}
                                    <a
                                      href={`tel:${request.assignedTo.phoneNumber}`}
                                      className="text-bnf-blue dark:text-blue-400 hover:underline sm:hidden block"
                                    >
                                      {request.assignedTo.phoneNumber}
                                    </a>
                                    {/* Desktop Span */}
                                    <span className="text-bnf-dark dark:text-gray-300 hidden sm:block">
                                      {request.assignedTo.phoneNumber}
                                    </span>
                                  </>
                                ) : (
                                  <span>-</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-bnf-gray dark:text-gray-400">미배정</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-bnf-gray dark:text-gray-400" />
                <div>
                  <div className="text-xs text-bnf-gray dark:text-gray-400">시스템</div>
                  <div className="text-sm text-bnf-dark dark:text-gray-200">
                    {request.erpSystem.name} {request.erpSystem.version ? `v${request.erpSystem.version}` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-bnf-dark dark:text-white mb-4">처리 현황</h3>

            <StatusTimeline status={request.status} createdAt={request.createdAt} updatedAt={request.updatedAt} />
          </div>
        </div>
      </div>
    </div>
  )
}
