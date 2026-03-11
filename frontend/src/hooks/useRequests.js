/**
 * ============================================================================
 * 파일명: hooks/useRequests.js
 * 경로: Frontend/src/hooks/useRequests.js
 * 설명: 요청 목록 조회 커스텀 훅 - 페이징, 필터링, 검색 통합 관리
 * ----------------------------------------------------------------------------
 * [주요 기능]
 *   - 요청 목록 API 호출 및 데이터 관리
 *   - 페이지네이션 상태 관리
 *   - 필터링 (상태, 우선순위, 회사)
 *   - 검색어 필터
 *   - 내부 사용자: 회사 목록 조회 포함
 *
 * [반환값]
 *   - requests: 요청 목록 배열
 *   - totalCount, totalPages: 페이징 정보
 *   - loading, error: 상태
 *   - setSearch, setStatus, setPriority...: 필터 변경 함수
 *   - refresh: 수동 새로고침
 *
 * [사용 예시]
 *   const {
 *     requests,
 *     loading,
 *     setStatus,
 *     setPage,
 *     refresh
 *   } = useRequests({ pageSize: 20 })
 *
 * [유지보수 가이드]
 *   - 새 필터 추가 시: params 상태에 추가, set 함수 생성, queryParams 빌드에 추가
 *   - API 응답 구조 변경 시: fetchRequests의 매핑 로직 수정
 * ============================================================================
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { requestsApi, companiesApi } from '../api'
import { useAuthStore } from '../store/authStore'

/**
 * 요청 목록 조회를 위한 커스텀 훅
 * @param {Object} initialParams - 초기 파라미터 (선택)
 * @param {number} [initialParams.page=1] - 초기 페이지
 * @param {number} [initialParams.pageSize=10] - 페이지 크기
 * @param {string} [initialParams.status] - 초기 상태 필터
 * @param {string} [initialParams.priority] - 초기 우선순위 필터
 * @returns {Object} 요청 데이터 및 컨트롤 함수
 */
export function useRequests(initialParams = {}) {
    const { isCustomer } = useAuthStore()

    // ─────────────────────────────────────────────────────────────────────────
    // 상태 정의
    // ─────────────────────────────────────────────────────────────────────────

    /** 요청 목록 데이터 */
    const [requests, setRequests] = useState([])

    /** 전체 요청 수 */
    const [totalCount, setTotalCount] = useState(0)

    /** 로딩 상태 */
    const [loading, setLoading] = useState(true)

    /** 에러 상태 */
    const [error, setError] = useState(null)

    /** 필터 및 페이지네이션 파라미터 */
    const [params, setParams] = useState({
        page: 1,
        pageSize: 10,
        search: '',
        status: '',
        priority: '',
        companyId: '',
        category: '',
        createdByUserId: '',
        ...initialParams
    })

    /** 회사 목록 (관리자용 필터 옵션) */
    const [companies, setCompanies] = useState([])

    // ─────────────────────────────────────────────────────────────────────────
    // 회사 목록 조회 (내부 사용자만)
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchCompanies = async () => {
            if (!isCustomer()) {
                try {
                    const response = await companiesApi.getAll()
                    setCompanies(response.data || [])
                } catch (err) {
                    console.error('회사 목록 조회 실패:', err)
                }
            }
        }
        fetchCompanies()
    }, [isCustomer])

    // ─────────────────────────────────────────────────────────────────────────
    // 요청 목록 조회
    // ─────────────────────────────────────────────────────────────────────────
    const fetchRequests = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            // 쿼리 파라미터 빌드
            const queryParams = {
                page: params.page,
                pageSize: params.pageSize
            }

            // 조건부 파라미터 추가
            if (params.search) queryParams.search = params.search
            if (params.status) queryParams.status = params.status
            if (params.priority) queryParams.priority = params.priority
            if (params.category) queryParams.category = params.category

            // 회사/작성자 필터는 내부 사용자만 사용 가능
            if (!isCustomer() && params.companyId) {
                queryParams.companyId = Number(params.companyId)
            }
            if (!isCustomer() && params.createdByUserId) {
                queryParams.createdByUserId = Number(params.createdByUserId)
            }

            const response = await requestsApi.getAll(queryParams)
            const data = response.data.items || []
            const total = response.data.totalCount || 0

            // API 응답을 컴포넌트에서 사용하기 쉬운 형태로 매핑
            const mapped = data.map((r) => ({
                id: r.requestId,
                title: r.title,
                content: r.content,
                status: r.status,
                priority: r.priority,
                category: r.category,
                companyName: r.companyName,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
                commentsCount: r.commentsCount,
                assignedTo: r.assignedTo ? r.assignedTo.name : null,
                createdBy: r.createdBy
            }))

            setRequests(mapped)
            setTotalCount(total)
        } catch (err) {
            console.error('요청 목록 조회 실패:', err)
            setError(err)
        } finally {
            setLoading(false)
        }
    }, [params, isCustomer])

    // 파라미터 변경 시 자동 조회
    useEffect(() => {
        fetchRequests()
    }, [fetchRequests])

    // ─────────────────────────────────────────────────────────────────────────
    // 필터 변경 함수 (페이지를 1로 리셋)
    // ─────────────────────────────────────────────────────────────────────────

    /** 검색어 변경 */
    const setSearch = useCallback((search) => {
        setParams(prev => ({ ...prev, search, page: 1 }))
    }, [])

    /** 상태 필터 변경 */
    const setStatus = useCallback((status) => {
        setParams(prev => ({ ...prev, status, page: 1 }))
    }, [])

    /** 우선순위 필터 변경 */
    const setPriority = useCallback((priority) => {
        setParams(prev => ({ ...prev, priority, page: 1 }))
    }, [])

    /** 회사 필터 변경 (내부 사용자용) */
    const setCompanyId = useCallback((companyId) => {
        setParams(prev => ({ ...prev, companyId, page: 1 }))
    }, [])

    /** 유형 필터 변경 */
    const setCategory = useCallback((category) => {
        setParams(prev => ({ ...prev, category, page: 1 }))
    }, [])

    /** 작성자 필터 변경 (내부 사용자용) */
    const setCreatedByUserId = useCallback((createdByUserId) => {
        setParams(prev => ({ ...prev, createdByUserId, page: 1 }))
    }, [])

    /** 페이지 변경 */
    const setPage = useCallback((page) => {
        setParams(prev => ({ ...prev, page }))
    }, [])

    /** 페이지 크기 변경 */
    const setPageSize = useCallback((pageSize) => {
        setParams(prev => ({ ...prev, pageSize, page: 1 }))
    }, [])

    /** 모든 필터 초기화 */
    const clearFilters = useCallback(() => {
        setParams(prev => ({
            ...prev,
            search: '',
            status: '',
            priority: '',
            companyId: '',
            category: '',
            createdByUserId: '',
            page: 1
        }))
    }, [])

    // ─────────────────────────────────────────────────────────────────────────
    // 계산된 값 (Memoized)
    // ─────────────────────────────────────────────────────────────────────────

    /** 전체 페이지 수 */
    const totalPages = useMemo(() =>
        Math.ceil(totalCount / params.pageSize),
        [totalCount, params.pageSize]
    )

    /** 활성화된 필터 존재 여부 */
    const hasActiveFilters = useMemo(() =>
        Boolean(params.search || params.status || params.priority || params.companyId || params.category || params.createdByUserId),
        [params]
    )

    // ─────────────────────────────────────────────────────────────────────────
    // 반환값
    // ─────────────────────────────────────────────────────────────────────────
    return {
        // 데이터
        requests,
        totalCount,
        totalPages,
        companies,

        // 상태
        loading,
        error,

        // 현재 파라미터
        currentPage: params.page,
        pageSize: params.pageSize,
        search: params.search,
        status: params.status,
        priority: params.priority,
        companyId: params.companyId,
        category: params.category,
        createdByUserId: params.createdByUserId,
        hasActiveFilters,

        // 액션
        setSearch,
        setStatus,
        setPriority,
        setCompanyId,
        setCategory,
        setCreatedByUserId,
        setPage,
        setPageSize,
        clearFilters,
        refresh: fetchRequests
    }
}
