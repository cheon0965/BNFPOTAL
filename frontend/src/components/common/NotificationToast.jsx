/**
 * ============================================================================
 * File: components/common/NotificationToast.jsx
 * Description: Realtime notification toast UI component
 * ============================================================================
 */

import { useNavigate } from 'react-router-dom'
import { useNotificationStore } from '../../store/notificationStore'
import { useAuthStore } from '../../store/authStore'
import { X, MessageSquare, AlertTriangle, UserCheck, FileText, ClipboardList } from 'lucide-react'

const TYPE_CONFIG = {
    NewRequest: {
        icon: FileText,
        color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
        label: '새 요청'
    },
    StatusChanged: {
        icon: AlertTriangle,
        color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30',
        label: '상태 변경'
    },
    AssignedToYou: {
        icon: UserCheck,
        color: 'text-green-500 bg-green-50 dark:bg-green-900/30',
        label: '담당자 배정'
    },
    NewComment: {
        icon: MessageSquare,
        color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30',
        label: '새 코멘트'
    },
    TaskAssigned: {
        icon: ClipboardList,
        color: 'text-green-500 bg-green-50 dark:bg-green-900/30',
        label: '업무 배정'
    },
    TaskCompleted: {
        icon: ClipboardList,
        color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
        label: '업무 완료'
    },
    TaskNotification: {
        icon: ClipboardList,
        color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30',
        label: '업무 알림'
    }
}

export default function NotificationToast() {
    const navigate = useNavigate()
    const toast = useNotificationStore(s => s.toastNotification)
    const dismissToast = useNotificationStore(s => s.dismissToast)
    const isAdmin = useAuthStore(s => s.isAdmin)

    if (!toast) return null

    const notificationType = toast.type || toast.Type
    const requestId = toast.requestId ?? toast.RequestId
    const taskId = toast.taskId ?? toast.TaskId
    const title = toast.title || toast.Title || toast.message || toast.Message || '알림'
    const status = toast.status || toast.Status || toast.newStatus || toast.NewStatus
    const priority = toast.priority || toast.Priority

    const config = TYPE_CONFIG[notificationType] || TYPE_CONFIG.NewRequest
    const Icon = config.icon

    const handleClick = () => {
        dismissToast()

        if (taskId) {
            navigate(`/admin/tasks/${taskId}`)
            return
        }

        if (requestId) {
            const basePath = isAdmin() ? '/admin/requests' : '/requests'
            navigate(`${basePath}/${requestId}`)
        }
    }

    return (
        <div className="fixed top-4 right-4 z-[9999] animate-slide-down max-w-sm w-full">
            <div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
                onClick={handleClick}
            >
                <div className="p-4 flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-bnf-blue dark:text-blue-400 uppercase tracking-wider">
                                {config.label}
                            </span>
                            {priority === 'CRITICAL' && (
                                <span className="text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded font-medium">
                                    긴급
                                </span>
                            )}
                        </div>
                        <p className="text-sm font-medium text-bnf-dark dark:text-gray-200 truncate">
                            {title}
                        </p>
                        {status && (
                            <p className="text-xs text-bnf-gray dark:text-gray-500 mt-0.5">
                                상태: {status}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={e => { e.stopPropagation(); dismissToast() }}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                    >
                        <X className="w-4 h-4 text-bnf-gray dark:text-gray-400" />
                    </button>
                </div>
                <div className="h-1 bg-gray-100 dark:bg-gray-700">
                    <div
                        className="h-full bg-bnf-blue rounded-full"
                        style={{ animation: 'shrink-width 4s linear forwards' }}
                    />
                </div>
            </div>
        </div>
    )
}
