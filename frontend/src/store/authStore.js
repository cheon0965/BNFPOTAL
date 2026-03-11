/**
 * ============================================================================
 * 파일명: store/authStore.js
 * 경로: Frontend/src/store/authStore.js
 * 설명: 인증 상태 관리 스토어 (Zustand + LocalStorage 영속화)
 * ----------------------------------------------------------------------------
 * [상태]
 *   - user: 현재 로그인한 사용자 정보 (UserDto)
 *   - token: JWT Access Token
 *   - isAuthenticated: 로그인 여부
 *
 * [주요 메서드]
 *   - login(user, token): 로그인 처리
 *   - logout(): 로그아웃 처리
 *   - updateUser(data): 사용자 정보 부분 업데이트
 *   - isAdmin(): 내부 사용자 여부 확인
 *   - isCustomer(): 고객 여부 확인
 *
 * [사용 방법]
 *   import { useAuthStore } from '@/store/authStore'
 *   const { user, isAuthenticated, login, logout } = useAuthStore()
 *   // 또는 컴포넌트 외부에서
 *   const token = useAuthStore.getState().token
 *
 * [LocalStorage]
 *   - 키: 'bnf-auth-storage'
 *   - 새로고침 후에도 로그인 상태 유지
 *
 * [유지보수 가이드]
 *   - 사용자 정보 필드 추가 시 updateUser 확인
 *   - 역할 추가 시 isAdmin, isCustomer 로직 수정
 * ============================================================================
 */

import { USER_ROLES } from '../constants'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 인증 상태 관리 스토어
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      // ─────────────────────────────────────────────────────────────────────
      // 상태 (State)
      // ─────────────────────────────────────────────────────────────────────
      user: null,              // 로그인한 사용자 정보
      token: null,             // JWT Access Token
      isAuthenticated: false,  // 로그인 여부
      
      // ─────────────────────────────────────────────────────────────────────
      // 액션 (Actions)
      // ─────────────────────────────────────────────────────────────────────
      
      /**
       * 로그인 처리
       * @param {Object} userData - 사용자 정보 (UserDto)
       * @param {string} token - JWT Access Token
       */
      login: (userData, token) => {
        set({
          user: userData,
          token: token,
          isAuthenticated: true
        })
      },
      
      /**
       * 로그아웃 처리
       * - LocalStorage에서 상태 제거
       * - Refresh Token 폐기는 api/index.js에서 처리
       */
      logout: async () => {
        try {
          // 서버에 로그아웃 요청 (Refresh Token 폐기)
          // authApi는 import하지 않음 (순환 참조 방지)
        } catch (error) {
          console.error('로그아웃 중 오류:', error)
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false
          })
        }
      },
      
      /**
       * 사용자 정보 부분 업데이트
       * @param {Object} userData - 업데이트할 필드들
       */
      updateUser: (userData) => {
        set({ user: { ...get().user, ...userData } })
      },
      
      // ─────────────────────────────────────────────────────────────────────
      // 헬퍼 메서드 (Helpers)
      // ─────────────────────────────────────────────────────────────────────
      
      /** 현재 토큰 반환 */
      getToken: () => get().token,
      
      /**
       * 내부 사용자(관리자/매니저/엔지니어) 여부 확인
       * @returns {boolean} 내부 사용자이면 true
       */
      isAdmin: () => {
        const user = get().user
        return user && [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ENGINEER].includes(user.role)
      },
      
      /**
       * 고객 여부 확인
       * @returns {boolean} 고객이면 true
       */
      isCustomer: () => {
        const user = get().user
        return user && user.role === USER_ROLES.CUSTOMER
      }
    }),
    {
      // ─────────────────────────────────────────────────────────────────────
      // LocalStorage 영속화 설정
      // ─────────────────────────────────────────────────────────────────────
      name: 'bnf-auth-storage',  // LocalStorage 키
      partialize: (state) => ({  // 저장할 상태만 선택
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
