/**
 * ============================================================================
 * 파일명: api/index.js
 * 경로: Frontend/src/api/index.js
 * 설명: API 통신 모듈 - Axios 인스턴스 및 API 래퍼 함수
 * ----------------------------------------------------------------------------
 * [주요 기능]
 *   - Axios 인스턴스 생성 및 인터셉터 설정
 *   - JWT 토큰 자동 첨부 (Request Interceptor)
 *   - 401 에러 시 자동 토큰 갱신 (Response Interceptor)
 *   - 도메인별 API 래퍼 함수 제공
 *
 * [API 그룹]
 *   - authApi: 인증 (로그인, 회원가입, 토큰 갱신)
 *   - requestsApi: 유지보수 요청 CRUD
 *   - commentsApi: 요청 댓글
 *   - attachmentsApi: 첨부파일 업로드/다운로드
 *   - companiesApi, usersApi: 회사/사용자 관리
 *   - dashboardApi: 대시보드 통계
 *
 * [사용 방법]
 *   import { requestsApi, authApi } from '@/api'
 *   const response = await requestsApi.getAll({ page: 1, pageSize: 20 })
 *
 * [유지보수 가이드]
 *   - 새 API 추가 시 해당 도메인 객체에 메서드 추가
 *   - axios 직접 사용 금지, 반드시 이 모듈의 래퍼 사용
 *   - 인증 관련 로직 수정 시 인터셉터 코드 확인 필요
 * ============================================================================
 */

import axios from 'axios'
import { useAuthStore } from '../store/authStore'

// ─────────────────────────────────────────────────────────────────────────────
// Axios 인스턴스 생성
// ─────────────────────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true  // Refresh Token Cookie 전송을 위해 필수
})

// ─────────────────────────────────────────────────────────────────────────────
// Request Interceptor - JWT 토큰 자동 첨부
// ─────────────────────────────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ─────────────────────────────────────────────────────────────────────────────
// Response Interceptor - 401 에러 시 자동 토큰 갱신
// ─────────────────────────────────────────────────────────────────────────────
let isRefreshing = false      // 토큰 갱신 중 여부
let failedQueue = []          // 갱신 대기 중인 요청 큐

/**
 * 대기 큐의 요청들을 처리
 * @param {Error|null} error - 에러 객체 (실패 시)
 * @param {string|null} token - 새 토큰 (성공 시)
 */
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })

  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // 401 에러이고 아직 재시도하지 않은 경우
    if (error.response?.status === 401 && !originalRequest._retry) {

      // 이미 토큰 갱신 중이면 대기열에 추가
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch(err => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Refresh Token(Cookie)으로 새 Access Token 요청
        const response = await axios.post(
          '/api/auth/refresh',
          {},
          { withCredentials: true }
        )

        const { token, user } = response.data

        // 새 Access Token 저장
        useAuthStore.getState().login(user, token)

        // 대기 중인 요청들에 새 토큰 전달
        processQueue(null, token)

        // 원래 요청 재시도
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)

      } catch (refreshError) {
        // Refresh 실패 시 로그아웃 처리
        processQueue(refreshError, null)
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)

      } finally {
        isRefreshing = false
      }
    }

    // 다른 401 에러 (토큰 갱신 실패 후 등)
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// API 래퍼 함수들
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 인증 관련 API
 */
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  logoutAll: () => api.post('/auth/logout-all'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
  validateResetToken: (token) => api.post('/auth/validate-reset-token', { token }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword })
}

/**
 * 회사 관리 API (관리자 전용)
 */
export const companiesApi = {
  getAll: (params) => api.get('/companies', { params }),
  getById: (id) => api.get(`/companies/${id}`),
  getMy: () => api.get('/companies/my'),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`)
}

/**
 * 사용자 관리 API (관리자 전용)
 */
export const usersApi = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id) => api.post(`/users/${id}/reset-password`)
}

/**
 * 등록 코드 API (관리자 전용)
 */
export const registrationCodesApi = {
  getAll: (params) => api.get('/registration-codes', { params }),
  getById: (id) => api.get(`/registration-codes/${id}`),
  create: (data) => api.post('/registration-codes', data),
  update: (id, data) => api.put(`/registration-codes/${id}`, data),
  delete: (id) => api.delete(`/registration-codes/${id}`),
  validate: (code) => api.post('/auth/registration-codes/validate', { code })
}

/**
 * 유지보수 요청 API
 */
export const requestsApi = {
  getAll: (params) => api.get('/requests', { params }),
  getById: (id) => api.get(`/requests/${id}`),
  create: (data) => api.post('/requests', data),
  update: (id, data) => api.put(`/requests/${id}`, data),
  updateStatus: (id, status) => api.patch(`/requests/${id}/status`, { status }),
  assignTo: (id, userId) => api.patch(`/requests/${id}/assignee`, { userId }),
  delete: (id) => api.delete(`/requests/${id}`),
  getStats: () => api.get('/requests/stats'),
  exportExcel: (params) => api.get('/requests/export', { params, responseType: 'blob' })
}

/**
 * 요청 댓글 API
 */
export const commentsApi = {
  getByRequest: (requestId) => api.get(`/requests/${requestId}/comments`),
  create: (requestId, data) => api.post(`/requests/${requestId}/comments`, data),
  update: (requestId, commentId, data) => api.put(`/requests/${requestId}/comments/${commentId}`, data),
  delete: (requestId, commentId) => api.delete(`/requests/${requestId}/comments/${commentId}`)
}

/**
 * 첨부파일 API
 */
export const attachmentsApi = {
  /** 요청에 파일 첨부 */
  upload: (requestId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/requests/${requestId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  /** 댓글에 파일 첨부 */
  uploadToComment: (requestId, commentId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/requests/${requestId}/attachments/comment/${commentId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  /** 파일 다운로드 (Blob 반환) */
  download: (requestId, attachmentId) => api.get(`/requests/${requestId}/attachments/${attachmentId}/download`, {
    responseType: 'blob'
  }),
  delete: (requestId, attachmentId) => api.delete(`/requests/${requestId}/attachments/${attachmentId}`),
  /** 본문 에디터용 이미지 파일 업로드 */
  uploadInlineImage: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/attachments/inline', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

/**
 * ERP 시스템 API (관리자 전용)
 */
export const erpSystemsApi = {
  getAll: (params) => api.get('/erp-systems', { params }),
  getByCompany: (companyId) => api.get(`/companies/${companyId}/erp-systems`),
  create: (data) => api.post('/erp-systems', data),
  update: (id, data) => api.put(`/erp-systems/${id}`, data),
  delete: (id) => api.delete(`/erp-systems/${id}`)
}

/**
 * 알림 API
 */
export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all')
}

/**
 * 이메일 템플릿 API (관리자 전용)
 */
export const emailTemplatesApi = {
  getAll: () => api.get('/email-templates'),
  get: (id) => api.get(`/email-templates/${id}`),
  update: (id, data) => api.put(`/email-templates/${id}`, data)
}

/**
 * 이메일 설정 API (관리자 전용)
 */
export const emailSettingsApi = {
  get: () => api.get('/email-settings'),
  update: (data) => api.put('/email-settings', data)
}

/**
 * 대시보드 통계 API
 */
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getAdminStats: () => api.get('/dashboard/admin-stats')
}

/**
 * 공지사항 API
 */
export const noticesApi = {
  getAll: (params) => api.get('/notices', { params }),
  getRecent: (count = 3) => api.get('/notices/recent', { params: { count } }),
  getById: (id) => api.get(`/notices/${id}`),
  create: (data) => api.post('/notices', data),
  update: (id, data) => api.put(`/notices/${id}`, data),
  delete: (id) => api.delete(`/notices/${id}`),
  /** Admin용 전체 목록 (비활성 포함) */
  getAllAdmin: (params) => api.get('/notices/admin', { params }),
  /** 첨부파일 업로드 */
  uploadAttachment: (noticeId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/notices/${noticeId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  /** 첨부파일 다운로드 */
  downloadAttachment: (noticeId, attachmentId) => api.get(`/notices/${noticeId}/attachments/${attachmentId}/download`, {
    responseType: 'blob'
  }),
  deleteAttachment: (noticeId, attachmentId) => api.delete(`/notices/${noticeId}/attachments/${attachmentId}`)
}

export const auditLogsApi = {
  getAll: (params) => {
    return api.get('/auditlogs', { params })
  }
}

/**
 * 내부 업무 API (내부 직원 전용)
 */
export const tasksApi = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  delete: (id) => api.delete(`/tasks/${id}`),
  getStats: () => api.get('/tasks/stats'),
  getUsers: () => api.get('/tasks/users'),
  getCompanies: () => api.get('/tasks/companies'),
  getErpSystems: (companyId) => api.get('/tasks/erp-systems', { params: { companyId } }),
  exportExcel: (params) => api.get('/tasks/export', { params, responseType: 'blob' })
}

/**
 * 업무 코멘트 API
 */
export const taskCommentsApi = {
  getByTask: (taskId) => api.get(`/tasks/${taskId}/comments`),
  create: (taskId, data) => api.post(`/tasks/${taskId}/comments`, data),
  delete: (taskId, commentId) => api.delete(`/tasks/${taskId}/comments/${commentId}`)
}

/**
 * 업무 첨부파일 API
 */
export const taskAttachmentsApi = {
  /** 업무에 파일 첨부 */
  upload: (taskId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/tasks/${taskId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  /** 코멘트에 파일 첨부 */
  uploadToComment: (taskId, commentId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/tasks/${taskId}/attachments/comment/${commentId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  /** 파일 다운로드 (Blob) */
  download: (taskId, attachmentId) => api.get(`/tasks/${taskId}/attachments/${attachmentId}/download`, {
    responseType: 'blob'
  }),
  /** 파일 삭제 */
  delete: (taskId, attachmentId) => api.delete(`/tasks/${taskId}/attachments/${attachmentId}`)
}

export default api