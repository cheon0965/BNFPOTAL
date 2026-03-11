import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { tasksApi, taskAttachmentsApi } from '../../api'
import {
    ArrowLeft,
    ClipboardList,
    Save,
    Loader2,
    Paperclip,
    X,
    FileText,
    Image as ImageIcon,
    ChevronDown,
    Check,
    Search
} from 'lucide-react'
import RichTextEditor from '../../components/RichTextEditor'

export default function TaskFormPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const isEdit = Boolean(id)
    const fileInputRef = useRef(null)
    const referencePickerRef = useRef(null)

    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [users, setUsers] = useState([])
    const [companies, setCompanies] = useState([])
    const [erpSystems, setErpSystems] = useState([])

    const [form, setForm] = useState({
        title: '',
        content: '',
        category: 'GENERAL',
        priority: 'MEDIUM',
        assignedToUserId: '',
        referenceUserIds: [],
        companyId: '',
        erpSystemId: '',
        dueDate: ''
    })

    const [newFiles, setNewFiles] = useState([])
    const [existingFiles, setExistingFiles] = useState([])
    const [deletedFileIds, setDeletedFileIds] = useState([])

    const [referenceOpen, setReferenceOpen] = useState(false)
    const [referenceQuery, setReferenceQuery] = useState('')

    useEffect(() => {
        fetchUsers()
        fetchCompanies()
        if (isEdit) {
            fetchTask()
        }
    }, [id])

    useEffect(() => {
        if (form.companyId) {
            fetchErpSystems(form.companyId)
        } else {
            setErpSystems([])
            setForm(prev => ({ ...prev, erpSystemId: '' }))
        }
    }, [form.companyId])

    useEffect(() => {
        if (!referenceOpen) return

        const handleClickOutside = (event) => {
            if (referencePickerRef.current && !referencePickerRef.current.contains(event.target)) {
                setReferenceOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [referenceOpen])

    useEffect(() => {
        if (!referenceOpen) {
            setReferenceQuery('')
        }
    }, [referenceOpen])

    const fetchUsers = async () => {
        try {
            const res = await tasksApi.getUsers()
            setUsers(res.data || [])
        } catch (error) {
            console.error('직원 목록 조회 실패:', error)
        }
    }

    const fetchCompanies = async () => {
        try {
            const res = await tasksApi.getCompanies()
            setCompanies(res.data || [])
        } catch (error) {
            console.error('회사 목록 조회 실패:', error)
        }
    }

    const fetchErpSystems = async (companyId) => {
        try {
            const res = await tasksApi.getErpSystems(companyId)
            setErpSystems(res.data || [])
        } catch (error) {
            console.error('ERP 시스템 목록 조회 실패:', error)
        }
    }

    const fetchTask = async () => {
        try {
            setLoading(true)
            const res = await tasksApi.getById(id)
            const task = res.data

            setForm({
                title: task.title || '',
                content: task.content || '',
                category: task.category || 'GENERAL',
                priority: task.priority || 'MEDIUM',
                assignedToUserId: task.assignedTo?.userId || '',
                referenceUserIds: (task.referenceUsers || []).map(u => u.userId),
                companyId: task.companyId || '',
                erpSystemId: task.erpSystemId || '',
                dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
            })

            if (task.companyId) {
                fetchErpSystems(task.companyId)
            }

            setExistingFiles(task.attachments || [])
        } catch (error) {
            console.error('업무 조회 실패:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setForm(prev => {
            const next = { ...prev, [name]: value }

            if (name === 'companyId') {
                next.erpSystemId = ''
            }

            if (name === 'assignedToUserId') {
                const assignedId = value ? parseInt(value, 10) : null
                next.referenceUserIds = prev.referenceUserIds.filter(userId => userId !== assignedId)
            }

            return next
        })
    }

    const handleReferenceToggle = (userId) => {
        const normalizedId = Number(userId)
        setForm(prev => {
            const selected = (prev.referenceUserIds || []).map(Number)
            const exists = selected.includes(normalizedId)
            return {
                ...prev,
                referenceUserIds: exists
                    ? selected.filter(idValue => idValue !== normalizedId)
                    : [...selected, normalizedId]
            }
        })
    }

    const handleClearReferences = () => {
        setForm(prev => ({ ...prev, referenceUserIds: [] }))
    }

    const handleEditorChange = (content) => {
        setForm(prev => ({ ...prev, content }))
    }

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || [])
        setNewFiles(prev => [...prev, ...files])
        e.target.value = ''
    }

    const removeNewFile = (index) => {
        setNewFiles(prev => prev.filter((_, i) => i !== index))
    }

    const removeExistingFile = (attachmentId) => {
        setDeletedFileIds(prev => [...prev, attachmentId])
        setExistingFiles(prev => prev.filter(file => file.taskAttachmentId !== attachmentId))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!form.title.trim() || !form.content.trim() || !form.assignedToUserId) {
            alert('제목, 내용, 담당자는 필수 입력입니다.')
            return
        }

        setSubmitting(true)
        try {
            const data = {
                ...form,
                assignedToUserId: parseInt(form.assignedToUserId, 10),
                referenceUserIds: [...new Set((form.referenceUserIds || []).map(v => parseInt(v, 10)).filter(Number.isInteger))],
                companyId: form.companyId ? parseInt(form.companyId, 10) : null,
                erpSystemId: form.erpSystemId ? parseInt(form.erpSystemId, 10) : null,
                dueDate: form.dueDate || null
            }

            let taskId = id
            if (isEdit) {
                await tasksApi.update(id, data)
            } else {
                const res = await tasksApi.create(data)
                taskId = res.data.taskId
            }

            for (const fileId of deletedFileIds) {
                try {
                    await taskAttachmentsApi.delete(taskId, fileId)
                } catch (err) {
                    console.error('첨부파일 삭제 실패:', err)
                }
            }

            for (const file of newFiles) {
                try {
                    await taskAttachmentsApi.upload(taskId, file)
                } catch (err) {
                    console.error('첨부파일 업로드 실패:', err)
                }
            }

            navigate(`/admin/tasks/${taskId}`)
        } catch (error) {
            console.error('업무 저장 실패:', error)
            alert('업무 저장에 실패했습니다.')
        } finally {
            setSubmitting(false)
        }
    }

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const isImageFile = (fileName) => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName)

    const renderFileIcon = (fileName) => {
        if (isImageFile(fileName)) {
            return <ImageIcon className="w-4 h-4 text-blue-400" />
        }
        return <FileText className="w-4 h-4 text-bnf-gray dark:text-gray-400" />
    }

    const categoryOptions = [
        { value: 'GENERAL', label: '일반' },
        { value: 'DEVELOPMENT', label: '개발' },
        { value: 'REVIEW', label: '검토/리뷰' },
        { value: 'MEETING', label: '회의' },
        { value: 'OTHER', label: '기타' }
    ]

    const priorityOptions = [
        { value: 'LOW', label: '낮음' },
        { value: 'MEDIUM', label: '보통' },
        { value: 'HIGH', label: '높음' },
        { value: 'CRITICAL', label: '긴급' }
    ]

    const referenceCandidates = useMemo(
        () => users.filter(user => String(user.userId) !== String(form.assignedToUserId)),
        [users, form.assignedToUserId]
    )

    const selectedReferenceUsers = useMemo(() => {
        const selectedIds = new Set((form.referenceUserIds || []).map(Number).filter(Number.isInteger))
        return users.filter(user => selectedIds.has(Number(user.userId)))
    }, [users, form.referenceUserIds])

    const filteredReferenceCandidates = useMemo(() => {
        const query = referenceQuery.trim().toLowerCase()
        if (!query) return referenceCandidates
        return referenceCandidates.filter(user => {
            const text = `${user.name || ''} ${user.email || ''} ${user.role || ''}`.toLowerCase()
            return text.includes(query)
        })
    }, [referenceCandidates, referenceQuery])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-bnf-orange" />
            </div>
        )
    }

    return (
        <div className="animate-fade-in max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Link
                    to="/admin/tasks"
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-bnf-gray dark:text-gray-400 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-bnf-orange/10 flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-bnf-orange" />
                    </div>
                    <h1 className="text-2xl font-bold text-bnf-dark dark:text-white tracking-tight">
                        {isEdit ? '업무 수정' : '업무 지시'}
                    </h1>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5 shadow-sm">
                    <div>
                        <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">업무 제목 *</label>
                        <input
                            type="text"
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50"
                            placeholder="업무 제목을 입력하세요"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">업무 내용 *</label>
                        <RichTextEditor
                            value={form.content}
                            onChange={handleEditorChange}
                            placeholder="업무 내용을 상세히 입력하세요"
                            minHeight="500px"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">담당자 *</label>
                            <select
                                name="assignedToUserId"
                                value={form.assignedToUserId}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/50"
                                required
                            >
                                <option value="">담당자 선택</option>
                                {users.map(user => (
                                    <option key={user.userId} value={user.userId}>
                                        {user.name} ({user.role})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">카테고리</label>
                            <select
                                name="category"
                                value={form.category}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/50"
                            >
                                {categoryOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">참조자 (복수 선택)</label>
                        <div ref={referencePickerRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setReferenceOpen(prev => !prev)}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-left text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 flex items-center justify-between gap-3"
                            >
                                <div className="min-w-0 flex-1">
                                    {selectedReferenceUsers.length > 0 ? (
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {selectedReferenceUsers.slice(0, 3).map(user => (
                                                <span
                                                    key={user.userId}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bnf-orange/10 text-bnf-orange text-xs"
                                                >
                                                    {user.name}
                                                </span>
                                            ))}
                                            {selectedReferenceUsers.length > 3 && (
                                                <span className="text-xs text-bnf-gray dark:text-gray-400">
                                                    +{selectedReferenceUsers.length - 3}명
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-bnf-gray dark:text-gray-400">참조자 선택</span>
                                    )}
                                </div>
                                <ChevronDown className={`w-4 h-4 text-bnf-gray dark:text-gray-400 transition-transform ${referenceOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {referenceOpen && (
                                <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
                                    <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                                        <div className="relative">
                                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-bnf-gray dark:text-gray-400" />
                                            <input
                                                type="text"
                                                value={referenceQuery}
                                                onChange={(e) => setReferenceQuery(e.target.value)}
                                                placeholder="이름/이메일 검색"
                                                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/40"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-56 overflow-y-auto p-1">
                                        {filteredReferenceCandidates.length > 0 ? (
                                            filteredReferenceCandidates.map(user => {
                                                const checked = (form.referenceUserIds || []).map(Number).includes(Number(user.userId))
                                                return (
                                                    <button
                                                        key={user.userId}
                                                        type="button"
                                                        onClick={() => handleReferenceToggle(user.userId)}
                                                        className="w-full px-3 py-2 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                                                    >
                                                        <span className={`w-4 h-4 rounded border flex items-center justify-center ${checked ? 'border-bnf-orange bg-bnf-orange text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                                            {checked && <Check className="w-3 h-3" />}
                                                        </span>
                                                        <span className="text-sm text-bnf-dark dark:text-gray-300">
                                                            {user.name} ({user.role})
                                                        </span>
                                                    </button>
                                                )
                                            })
                                        ) : (
                                            <p className="text-sm text-bnf-gray dark:text-gray-500 px-3 py-4 text-center">
                                                선택 가능한 참조자가 없습니다.
                                            </p>
                                        )}
                                    </div>
                                    <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                        <span className="text-xs text-bnf-gray dark:text-gray-400">선택 {selectedReferenceUsers.length}명</span>
                                        <button
                                            type="button"
                                            onClick={handleClearReferences}
                                            className="text-xs text-bnf-orange hover:underline"
                                        >
                                            전체 해제
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">회사</label>
                            <select
                                name="companyId"
                                value={form.companyId}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/50"
                            >
                                <option value="">회사 선택 (선택사항)</option>
                                {companies.map(company => (
                                    <option key={company.companyId} value={company.companyId}>{company.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">ERP 시스템</label>
                            <select
                                name="erpSystemId"
                                value={form.erpSystemId}
                                onChange={handleChange}
                                disabled={!form.companyId}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="">{form.companyId ? 'ERP 시스템 선택 (선택사항)' : '먼저 회사를 선택하세요'}</option>
                                {erpSystems.map(system => (
                                    <option key={system.erpSystemId} value={system.erpSystemId}>{system.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">우선순위</label>
                            <select
                                name="priority"
                                value={form.priority}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/50"
                            >
                                {priorityOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">마감일</label>
                            <input
                                type="date"
                                name="dueDate"
                                value={form.dueDate}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/50"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">첨부파일</label>
                        {existingFiles.length > 0 && (
                            <div className="space-y-2 mb-3">
                                {existingFiles.map(file => (
                                    <div key={file.taskAttachmentId} className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        {renderFileIcon(file.fileName)}
                                        <span className="text-sm text-bnf-dark dark:text-gray-300 flex-1 truncate">{file.fileName}</span>
                                        <span className="text-xs text-bnf-gray dark:text-gray-500">{formatFileSize(file.fileSize || 0)}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeExistingFile(file.taskAttachmentId)}
                                            className="p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded text-bnf-gray hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                                            title="삭제"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {newFiles.length > 0 && (
                            <div className="space-y-2 mb-3">
                                {newFiles.map((file, index) => (
                                    <div key={index} className="flex items-center gap-3 px-3 py-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                                        {isImageFile(file.name) ? (
                                            <div className="w-10 h-10 rounded overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt={file.name}
                                                    className="w-full h-full object-cover"
                                                    onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                                                />
                                            </div>
                                        ) : (
                                            renderFileIcon(file.name)
                                        )}
                                        <span className="text-sm text-bnf-dark dark:text-gray-300 flex-1 truncate">{file.name}</span>
                                        <span className="text-xs text-bnf-gray dark:text-gray-500">{formatFileSize(file.size)}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeNewFile(index)}
                                            className="p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded text-bnf-gray hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                                            title="제거"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                            accept=".png,.jpg,.jpeg,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm text-bnf-gray dark:text-gray-400 hover:border-bnf-orange hover:text-bnf-orange dark:hover:border-bnf-orange dark:hover:text-bnf-orange transition-colors w-full justify-center"
                        >
                            <Paperclip className="w-4 h-4" />
                            파일 첨부 (이미지, 문서 등)
                        </button>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <Link
                        to="/admin/tasks"
                        className="px-6 py-3 rounded-xl text-bnf-gray dark:text-gray-400 hover:text-bnf-dark dark:hover:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium shadow-sm"
                    >
                        취소
                    </Link>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-bnf-orange text-white hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isEdit ? '수정 완료' : '업무 지시'}
                    </button>
                </div>
            </form>
        </div>
    )
}
