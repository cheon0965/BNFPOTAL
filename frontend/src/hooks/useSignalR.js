/**
 * ============================================================================
 * 파일명: hooks/useSignalR.js
 * 설명: SignalR 연결 관리 커스텀 훅
 * ----------------------------------------------------------------------------
 * [주요 기능]
 *   - 로그인 시 자동으로 SignalR Hub에 연결
 *   - 로그아웃 시 자동 연결 해제
 *   - 재연결 정책 (자동 재연결)
 *   - 수신된 알림을 notificationStore에 전달
 * ============================================================================
 */

import { useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { useAuthStore } from '../store/authStore'
import { useNotificationStore } from '../store/notificationStore'

/**
 * SignalR 연결 관리 훅
 * - MainLayout / AdminLayout 에서 한 번씩만 호출
 */
export function useSignalR() {
    const connectionRef = useRef(null)
    const token = useAuthStore(s => s.token)
    const isAuthenticated = useAuthStore(s => s.isAuthenticated)
    const addNotification = useNotificationStore(s => s.addNotification)

    useEffect(() => {
        // 인증 상태가 아니면 연결하지 않음
        if (!isAuthenticated || !token) {
            // 기존 연결이 있으면 정리
            if (connectionRef.current) {
                connectionRef.current.stop()
                connectionRef.current = null
            }
            return
        }

        // 이미 연결 중이면 스킵
        if (connectionRef.current) return

        // SignalR 연결 생성
        const connection = new signalR.HubConnectionBuilder()
            .withUrl('/hubs/notifications', {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // 재연결 대기 시간(ms)
            .configureLogging(signalR.LogLevel.Warning)
            .build()

        // 알림 수신 핸들러 등록
        connection.on('ReceiveNotification', (data) => {
            addNotification(data)
        })

        // 연결 시작
        connection.start()
            .then(() => {
                console.log('[SignalR] 연결 성공')
            })
            .catch(err => {
                console.error('[SignalR] 연결 실패:', err)
            })

        connectionRef.current = connection

        // 클린업
        return () => {
            if (connectionRef.current) {
                connectionRef.current.stop()
                connectionRef.current = null
            }
        }
    }, [isAuthenticated, token, addNotification])
}
