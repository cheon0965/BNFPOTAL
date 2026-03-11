/**
 * ============================================================================
 * 파일명: store/notificationStore.js
 * 설명: 실시간 알림 상태 관리 스토어 (Zustand)
 * ----------------------------------------------------------------------------
 * [주요 기능]
 *   - SignalR을 통해 수신된 알림 목록 관리
 *   - 읽지 않은 알림 개수 추적
 *   - 토스트 알림 표시 상태 관리
 * ============================================================================
 */

import { create } from 'zustand'

export const useNotificationStore = create((set, get) => ({
    // ─── 상태 ───
    notifications: [],       // 최근 알림 목록 (최대 50개 유지)
    unreadCount: 0,          // 읽지 않은 알림 수
    toastNotification: null, // 현재 표시 중인 토스트 알림

    // ─── 액션 ───

    /** 새 알림 추가 (SignalR에서 수신 시 호출) */
    addNotification: (notification) => {
        const newNotification = {
            ...notification,
            id: Date.now(),
            receivedAt: new Date().toISOString(),
            read: false
        }

        set(state => ({
            notifications: [newNotification, ...state.notifications].slice(0, 50),
            unreadCount: state.unreadCount + 1,
            toastNotification: newNotification
        }))

        // 3초 후 토스트 자동 닫기
        setTimeout(() => {
            set(state => {
                if (state.toastNotification?.id === newNotification.id) {
                    return { toastNotification: null }
                }
                return {}
            })
        }, 4000)
    },

    /** 토스트 수동 닫기 */
    dismissToast: () => set({ toastNotification: null }),

    /** 모든 알림 읽음 처리 */
    markAllAsRead: () => set(state => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0
    })),

    /** 알림 전체 초기화 (로그아웃 시) */
    clearAll: () => set({ notifications: [], unreadCount: 0, toastNotification: null })
}))
