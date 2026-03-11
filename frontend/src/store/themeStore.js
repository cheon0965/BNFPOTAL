import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 테마(라이트/다크) 상태 관리 스토어
 */
export const useThemeStore = create(
    persist(
        (set) => ({
            theme: 'light', // 기본값은 'light'
            toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
            setTheme: (theme) => set({ theme }),
        }),
        {
            name: 'bnf-theme-storage', // localStorage 키
        }
    )
)
