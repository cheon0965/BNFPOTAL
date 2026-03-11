import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { tasksApi, taskCommentsApi, taskAttachmentsApi } from '../../api'
import { useAuthStore } from '../../store/authStore'
import {
    ArrowLeft,
    ClipboardList,
    Clock,
    User,
    Send,
    Trash2,
    Edit,
    CalendarDays,
    PlayCircle,
    CheckCircle2,
    XCircle,
    Loader2,
    Paperclip,
    Download,
    X,
    FileText,
    Image as ImageIcon,
    ZoomIn
} from 'lucide-react'
import DOMPurify from 'dompurify'

// 인증 이미지 컴포넌트 - API를 통해 이미지를 로드하여 표시
function TaskAuthenticatedImage({ taskId, attachmentId, alt, className, onClick }) {
    const [imageSrc, setImageSrc] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        let isMounted = true

        const loadImage = async () => {
            try {
                setLoading(true)
                setError(false)
                const response = await taskAttachmentsApi.download(taskId, attachmentId)
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
    }, [taskId, attachmentId])

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
                <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
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

export default function TaskDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [task, setTask] = useState(null)
    const [comments, setComments] = useState([])
    const [loading, setLoading] = useState(true)
    const [commentContent, setCommentContent] = useState('')
    const [commentFiles, setCommentFiles] = useState([])
    const [submitting, setSubmitting] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)
    const [previewImage, setPreviewImage] = useState(null)
    const [taskUnavailableMessage, setTaskUnavailableMessage] = useState('')
    const commentFileRef = useRef(null)

    useEffect(() => {
        fetchData()
    }, [id])

    const fetchData = async () => {
        try {
            setLoading(true)
            setTaskUnavailableMessage('')
            const [taskRes, commentsRes] = await Promise.all([
                tasksApi.getById(id),
                taskCommentsApi.getByTask(id)
            ])
            setTask(taskRes.data)
            setComments(commentsRes.data)
        } catch (error) {
            console.error('Task detail fetch failed:', error)
            setTask(null)
            setComments([])

            const status = error?.response?.status
            if (status === 404) {
                setTaskUnavailableMessage('삭제되었거나 더 이상 조회할 수 없는 업무입니다. 이메일 링크가 만료되었을 수 있습니다.')
            } else if (status === 403) {
                setTaskUnavailableMessage('이 업무를 조회할 권한이 없습니다.')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = async (newStatus) => {
        if (actionLoading) return
        setActionLoading(true)
        try {
            await tasksApi.updateStatus(id, newStatus)
            await fetchData()
        } catch (error) {
            console.error('상태 변경 실패:', error)
            alert('상태 변경에 실패했습니다.')
        } finally {
            setActionLoading(false)
        }
    }

    const handleAddComment = async (e) => {
        e.preventDefault()
        if ((!commentContent.trim() && commentFiles.length === 0) || submitting) return
        setSubmitting(true)
        try {
            const commentRes = await taskCommentsApi.create(id, { content: commentContent || '(첨부파일)' })
            const newCommentId = commentRes.data.taskCommentId

            for (const file of commentFiles) {
                try {
                    await taskAttachmentsApi.uploadToComment(id, newCommentId, file)
                } catch (err) {
                    console.error('코멘트 첨부파일 업로드 실패:', err)
                }
            }

            setCommentContent('')
            setCommentFiles([])
            const res = await taskCommentsApi.getByTask(id)
            setComments(res.data)
        } catch (error) {
            console.error('코멘트 작성 실패:', error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('이 코멘트를 삭제하시겠습니까?')) return
        try {
            await taskCommentsApi.delete(id, commentId)
            setComments(prev => prev.filter(c => c.taskCommentId !== commentId))
        } catch (error) {
            console.error('코멘트 삭제 실패:', error)
        }
    }

    const handleDelete = async () => {
        if (!window.confirm('이 업무를 삭제하시겠습니까?')) return
        try {
            await tasksApi.delete(id)
            navigate('/admin/tasks')
        } catch (error) {
            console.error('업무 삭제 실패:', error)
            alert('업무 삭제에 실패했습니다.')
        }
    }

    const handleDownload = async (attachmentId, fileName) => {
        try {
            const res = await taskAttachmentsApi.download(id, attachmentId)
            const url = window.URL.createObjectURL(new Blob([res.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', fileName)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error('다운로드 실패:', error)
            alert('파일 다운로드에 실패했습니다.')
        }
    }

    const handleDeleteAttachment = async (attachmentId) => {
        if (!window.confirm('이 첨부파일을 삭제하시겠습니까?')) return
        try {
            await taskAttachmentsApi.delete(id, attachmentId)
            await fetchData()
        } catch (error) {
            console.error('첨부파일 삭제 실패:', error)
            alert('첨부파일 삭제에 실패했습니다.')
        }
    }

    const handleDeleteCommentAttachment = async (attachmentId) => {
        if (!window.confirm('이 첨부파일을 삭제하시겠습니까?')) return
        try {
            await taskAttachmentsApi.delete(id, attachmentId)
            const res = await taskCommentsApi.getByTask(id)
            setComments(res.data)
        } catch (error) {
            console.error('첨부파일 삭제 실패:', error)
        }
    }

    const handleCommentFileSelect = (e) => {
        const files = Array.from(e.target.files)
        setCommentFiles(prev => [...prev, ...files])
        e.target.value = ''
    }

    const removeCommentFile = (index) => {
        setCommentFiles(prev => prev.filter((_, i) => i !== index))
    }

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    const isImageFile = (contentTypeOrName) => {
        if (!contentTypeOrName) return false
        // contentType 체크
        if (contentTypeOrName.startsWith('image/')) return true
        // 파일명 체크
        return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(contentTypeOrName)
    }

    const getFileIcon = (fileName) => {
        if (isImageFile(fileName)) return <ImageIcon className="w-4 h-4 text-blue-400" />
        return <FileText className="w-4 h-4 text-bnf-gray dark:text-gray-400" />
    }

    const openImagePreview = (attachmentId) => {
        setPreviewImage(attachmentId)
    }

    const closeImagePreview = () => {
        setPreviewImage(null)
    }

    const getStatusBadge = (status) => {
        const styles = {
            PENDING: 'bg-blue-500/20 text-blue-400',
            IN_PROGRESS: 'bg-yellow-500/20 text-yellow-400',
            COMPLETED: 'bg-green-500/20 text-green-400',
            CANCELLED: 'bg-gray-500/20 text-gray-400',
        }
        const labels = {
            PENDING: '대기',
            IN_PROGRESS: '진행중',
            COMPLETED: '완료',
            CANCELLED: '취소',
        }
        return <span className={`badge ${styles[status]}`}>{labels[status]}</span>
    }

    const getCategoryLabel = (category) => {
        const labels = { GENERAL: '일반', DEVELOPMENT: '개발', REVIEW: '검토/리뷰', MEETING: '회의', OTHER: '기타' }
        return labels[category] || category
    }

    const getPriorityLabel = (priority) => {
        const labels = { CRITICAL: '긴급', HIGH: '높음', MEDIUM: '보통', LOW: '낮음' }
        return labels[priority] || priority
    }

    const getPriorityColor = (priority) => {
        const colors = { CRITICAL: 'text-red-400', HIGH: 'text-orange-400', MEDIUM: 'text-yellow-400', LOW: 'text-green-400' }
        return colors[priority] || 'text-gray-400'
    }

    const formatDateTime = (dateString) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleString('ko-KR', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-bnf-orange" />
            </div>
        )
    }

    if (!task) {
        return (
            <div className="text-center py-12 text-bnf-gray dark:text-gray-400">
                <p>{taskUnavailableMessage || '업무를 찾을 수 없습니다.'}</p>
                <Link to="/admin/tasks" className="text-bnf-orange hover:underline mt-2 inline-block">목록으로 돌아가기</Link>
            </div>
        )
    }

    const isCreator = user?.userId === task.createdBy?.userId
    const isAssignee = user?.userId === task.assignedTo?.userId

    // 이미지/비이미지 파일 분류
    const imageAttachments = (task.attachments || []).filter(a => isImageFile(a.contentType) || isImageFile(a.fileName))
    const fileAttachments = (task.attachments || []).filter(a => !isImageFile(a.contentType) && !isImageFile(a.fileName))

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
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
                    <TaskAuthenticatedImage
                        taskId={parseInt(id)}
                        attachmentId={previewImage}
                        alt="미리보기"
                        className="max-w-full max-h-[90vh] object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Link
                    to="/admin/tasks"
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-bnf-gray dark:text-gray-400 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-bnf-orange/10 flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-bnf-orange" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-bnf-dark dark:text-white">{task.title}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(task.status)}
                            <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                                {getPriorityLabel(task.priority)}
                            </span>
                        </div>
                    </div>
                </div>
                {isCreator && comments.length === 0 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate(`/admin/tasks/${id}/edit`)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-transparent text-bnf-dark dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm dark:shadow-none"
                        >
                            <Edit className="w-4 h-4" />
                            수정
                        </button>
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            삭제
                        </button>
                    </div>
                )}
            </div>

            {/* Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div>
                        <div className="text-xs text-bnf-gray dark:text-gray-500 mb-1">지시자</div>
                        <div className="flex items-center gap-2 text-bnf-dark dark:text-gray-300">
                            <User className="w-4 h-4 text-bnf-gray dark:text-gray-500" />
                            {task.createdBy?.name}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-bnf-gray dark:text-gray-500 mb-1">담당자</div>
                        <div className="flex items-center gap-2 text-bnf-dark dark:text-gray-300">
                            <User className="w-4 h-4 text-bnf-gray dark:text-gray-500" />
                            {task.assignedTo?.name}
                        </div>
                    </div>
                    <div className="sm:col-span-2">
                        <div className="text-xs text-bnf-gray dark:text-gray-500 mb-1">참조자</div>
                        {(task.referenceUsers || []).length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {task.referenceUsers.map(refUser => (
                                    <span
                                        key={refUser.userId}
                                        className="inline-flex items-center rounded-full px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-bnf-dark dark:text-gray-300"
                                    >
                                        {refUser.name}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="text-bnf-dark dark:text-gray-300">-</div>
                        )}
                    </div>
                    <div>
                        <div className="text-xs text-bnf-gray dark:text-gray-500 mb-1">회사</div>
                        <div className="text-bnf-dark dark:text-gray-300">{task.companyName || '-'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-bnf-gray dark:text-gray-500 mb-1">ERP 시스템</div>
                        <div className="text-bnf-dark dark:text-gray-300">{task.erpSystemName || '-'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-bnf-gray dark:text-gray-500 mb-1">카테고리</div>
                        <div className="text-bnf-dark dark:text-gray-300">{getCategoryLabel(task.category)}</div>
                    </div>
                    <div>
                        <div className="text-xs text-bnf-gray dark:text-gray-500 mb-1">마감일</div>
                        <div className="flex items-center gap-2 text-bnf-dark dark:text-gray-300">
                            <CalendarDays className="w-4 h-4 text-bnf-gray dark:text-gray-500" />
                            {task.dueDate ? formatDateTime(task.dueDate).split(' ')[0] : '없음'}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-bnf-gray dark:text-gray-500 mb-1">등록일</div>
                        <div className="text-bnf-gray dark:text-gray-400 text-sm">{formatDateTime(task.createdAt)}</div>
                    </div>
                    <div>
                        <div className="text-xs text-bnf-gray dark:text-gray-500 mb-1">착수일</div>
                        <div className="text-bnf-gray dark:text-gray-400 text-sm">{formatDateTime(task.startedAt)}</div>
                    </div>
                    {task.completedAt && (
                        <div>
                            <div className="text-xs text-bnf-gray dark:text-gray-500 mb-1">완료일</div>
                            <div className="text-bnf-gray dark:text-gray-400 text-sm">{formatDateTime(task.completedAt)}</div>
                        </div>
                    )}
                </div>

                {/* 내용 */}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                    <div className="text-xs text-bnf-gray dark:text-gray-500 mb-2">업무 내용</div>
                    <div
                        className="text-bnf-dark dark:text-gray-300 ql-editor px-0 pb-0 min-h-0 break-words whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(task.content) }}
                    />
                </div>

                {/* 업무 첨부파일 */}
                {task.attachments && task.attachments.length > 0 && (
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-4">
                        <div className="text-xs text-bnf-gray dark:text-gray-500 mb-3 flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5" />
                            첨부파일 ({task.attachments.length})
                        </div>

                        {/* 이미지 미리보기 그리드 */}
                        {imageAttachments.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                                {imageAttachments.map(att => (
                                    <div
                                        key={att.taskAttachmentId}
                                        className="relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer group"
                                        onClick={() => openImagePreview(att.taskAttachmentId)}
                                    >
                                        <TaskAuthenticatedImage
                                            taskId={parseInt(id)}
                                            attachmentId={att.taskAttachmentId}
                                            alt={att.fileName}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <ZoomIn className="w-8 h-8 text-white" />
                                        </div>
                                        {/* 다운로드/삭제 버튼 레이아웃 */}
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-white truncate flex-1 mr-2">{att.fileName}</span>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDownload(att.taskAttachmentId, att.fileName) }}
                                                        className="p-1 hover:bg-white/20 rounded transition-colors"
                                                        title="다운로드"
                                                    >
                                                        <Download className="w-3.5 h-3.5 text-white" />
                                                    </button>
                                                    {isCreator && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(att.taskAttachmentId) }}
                                                            className="p-1 hover:bg-white/20 rounded transition-colors"
                                                            title="삭제"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5 text-white" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 비이미지 파일 목록 */}
                        {fileAttachments.length > 0 && (
                            <div className="space-y-2">
                                {fileAttachments.map(att => (
                                    <div key={att.taskAttachmentId} className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg group">
                                        {getFileIcon(att.fileName)}
                                        <span className="text-sm text-bnf-dark dark:text-gray-300 flex-1 truncate">{att.fileName}</span>
                                        <span className="text-xs text-bnf-gray dark:text-gray-500">{formatFileSize(att.fileSize)}</span>
                                        <button
                                            onClick={() => handleDownload(att.taskAttachmentId, att.fileName)}
                                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-bnf-gray dark:text-gray-400 hover:text-bnf-orange"
                                            title="다운로드"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                        {isCreator && (
                                            <button
                                                onClick={() => handleDeleteAttachment(att.taskAttachmentId)}
                                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors text-bnf-gray dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
                                                title="삭제"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Status Actions */}
            {(task.status !== 'COMPLETED' && task.status !== 'CANCELLED') && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm">
                    <div className="text-xs text-bnf-gray dark:text-gray-500 mb-3">상태 변경</div>
                    <div className="flex flex-wrap gap-2">
                        {isAssignee && task.status === 'PENDING' && (
                            <button
                                onClick={() => handleStatusChange('IN_PROGRESS')}
                                disabled={actionLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-400 rounded-lg hover:bg-yellow-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                <PlayCircle className="w-4 h-4" />
                                착수하기
                            </button>
                        )}
                        {isAssignee && task.status === 'IN_PROGRESS' && (
                            <button
                                onClick={() => handleStatusChange('COMPLETED')}
                                disabled={actionLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                완료 보고
                            </button>
                        )}
                        {isCreator && (
                            <button
                                onClick={() => handleStatusChange('CANCELLED')}
                                disabled={actionLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-500/10 text-gray-400 rounded-lg hover:bg-gray-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                <XCircle className="w-4 h-4" />
                                취소
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Comments */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="font-medium text-bnf-dark dark:text-white">코멘트/보고 ({comments.length})</h2>
                </div>

                {comments.length > 0 ? (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {comments.map((comment, index) => {
                            const isLastComment = index === comments.length - 1;
                            const commentImages = (comment.attachments || []).filter(a => isImageFile(a.contentType) || isImageFile(a.fileName))
                            const commentFilesOnly = (comment.attachments || []).filter(a => !isImageFile(a.contentType) && !isImageFile(a.fileName))

                            return (
                                <div key={comment.taskCommentId} className="px-6 py-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 bg-orange-50 dark:bg-bnf-orange/20 rounded-full flex items-center justify-center">
                                                <span className="text-xs font-medium text-bnf-orange">{comment.user?.name?.charAt(0)}</span>
                                            </div>
                                            <span className="text-sm font-medium text-bnf-dark dark:text-white">{comment.user?.name}</span>
                                            <span className="text-xs text-bnf-gray dark:text-gray-500">{formatDateTime(comment.createdAt)}</span>
                                        </div>
                                        {comment.user?.userId === user?.userId && isLastComment && (
                                            <button
                                                onClick={() => handleDeleteComment(comment.taskCommentId)}
                                                className="p-1 hover:bg-red-50 dark:hover:bg-gray-700 rounded text-bnf-gray hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="text-sm text-bnf-dark dark:text-gray-300 whitespace-pre-wrap ml-9">{comment.content}</div>

                                    {/* 코멘트 이미지 미리보기 */}
                                    {commentImages.length > 0 && (
                                        <div className="ml-9 mt-3 flex flex-wrap gap-2">
                                            {commentImages.map(att => (
                                                <div
                                                    key={att.taskAttachmentId}
                                                    className="relative w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer group"
                                                    onClick={() => openImagePreview(att.taskAttachmentId)}
                                                >
                                                    <TaskAuthenticatedImage
                                                        taskId={parseInt(id)}
                                                        attachmentId={att.taskAttachmentId}
                                                        alt={att.fileName}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                        <ZoomIn className="w-5 h-5 text-white" />
                                                    </div>
                                                    {comment.user?.userId === user?.userId && isLastComment && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteCommentAttachment(att.taskAttachmentId) }}
                                                            className="absolute top-1 right-1 p-0.5 bg-red-500/80 hover:bg-red-600 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                            title="삭제"
                                                        >
                                                            <X className="w-3 h-3 text-white" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* 코멘트 비이미지 첨부파일 */}
                                    {commentFilesOnly.length > 0 && (
                                        <div className="ml-9 mt-2 space-y-1.5">
                                            {commentFilesOnly.map(att => (
                                                <div key={att.taskAttachmentId} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                                                    {getFileIcon(att.fileName)}
                                                    <span className="text-bnf-dark dark:text-gray-300 flex-1 truncate">{att.fileName}</span>
                                                    <span className="text-xs text-bnf-gray dark:text-gray-500">{formatFileSize(att.fileSize)}</span>
                                                    <button
                                                        onClick={() => handleDownload(att.taskAttachmentId, att.fileName)}
                                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-bnf-gray dark:text-gray-400 hover:text-bnf-orange"
                                                        title="다운로드"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>
                                                    {comment.user?.userId === user?.userId && isLastComment && (
                                                        <button
                                                            onClick={() => handleDeleteCommentAttachment(att.taskAttachmentId)}
                                                            className="p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors text-bnf-gray dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
                                                            title="삭제"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="px-6 py-8 text-center text-bnf-gray dark:text-gray-500 text-sm">아직 코멘트가 없습니다</div>
                )}

                {/* Comment Form */}
                <form onSubmit={handleAddComment} className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-transparent">
                    {/* 코멘트 파일 미리보기 */}
                    {commentFiles.length > 0 && (
                        <div className="mb-3 space-y-1.5">
                            {commentFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-sm">
                                    {isImageFile(file.name) ? (
                                        <div className="w-8 h-8 rounded overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt={file.name}
                                                className="w-full h-full object-cover"
                                                onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                                            />
                                        </div>
                                    ) : (
                                        getFileIcon(file.name)
                                    )}
                                    <span className="text-bnf-dark dark:text-gray-300 flex-1 truncate">{file.name}</span>
                                    <span className="text-xs text-bnf-gray dark:text-gray-500">{formatFileSize(file.size)}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeCommentFile(idx)}
                                        className="p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded text-bnf-gray hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <div className="flex-1 flex flex-col gap-2">
                            <textarea
                                value={commentContent}
                                onChange={(e) => setCommentContent(e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 resize-none shadow-sm dark:shadow-none"
                                placeholder="코멘트를 입력하세요..."
                                rows={2}
                            />
                        </div>
                        <div className="flex flex-col gap-2 self-end">
                            <input
                                ref={commentFileRef}
                                type="file"
                                multiple
                                onChange={handleCommentFileSelect}
                                className="hidden"
                                accept=".png,.jpg,.jpeg,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                            />
                            <button
                                type="button"
                                onClick={() => commentFileRef.current?.click()}
                                className="p-3 bg-gray-100 dark:bg-gray-700 text-bnf-gray dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm dark:shadow-none"
                                title="파일 첨부"
                            >
                                <Paperclip className="w-5 h-5" />
                            </button>
                            <button
                                type="submit"
                                disabled={(!commentContent.trim() && commentFiles.length === 0) || submitting}
                                className="p-3 bg-bnf-orange text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm dark:shadow-none"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}


