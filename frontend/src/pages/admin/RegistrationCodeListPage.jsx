import { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  KeyRound,
  Trash2,
  Copy,
  Check,
  X,
  Building2,
  Calendar,
  Users,
  Link as LinkIcon,
  ExternalLink
} from 'lucide-react'
import { Pagination, ActionDropdown } from '../../components/common'

import { registrationCodesApi, companiesApi } from '../../api'
import { USER_ROLES, ROLE_LABELS, BNF_COMPANY_CODE } from '../../constants'

export default function RegistrationCodeListPage() {
  const [codes, setCodes] = useState([])

  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [showModal, setShowModal] = useState(false)
  const [menuOpen, setMenuOpen] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  const [formData, setFormData] = useState({
    companyId: '',
    description: '',
    maxUses: '',
    roleDefault: USER_ROLES.CUSTOMER,
    expiresAt: '',
    userIsActiveDefault: true
  })

  const [companies, setCompanies] = useState([])

  const handleCompanyChange = (e) => {
    const value = e.target.value
    setFormData((prev) => {
      const next = { ...prev, companyId: value }
      const selected = companies.find((c) => String(c.id) === String(value))
      const isBnf = selected && selected.code === BNF_COMPANY_CODE

      if (!isBnf) {
        // 일반 회사로 변경 시 기본 역할을 항상 고객으로 초기화
        next.roleDefault = USER_ROLES.CUSTOMER
      }

      return next
    })
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [codesRes, companiesRes] = await Promise.all([
          registrationCodesApi.getAll(),
          companiesApi.getAll()
        ])

        const codesData = codesRes.data || codesRes || []
        const companiesData = companiesRes.data || companiesRes || []

        const mappedCodes = codesData.map((c) => ({
          id: c.registrationCodeId ?? c.id,
          code: c.code,
          companyId: c.companyId,
          companyName: c.companyName,
          description: c.description || '',
          maxUses: c.maxUses,
          usedCount: c.usedCount,
          roleDefault: c.roleDefault,
          expiresAt: c.expiresAt,
          userIsActiveDefault: c.userIsActiveDefault,
          isActive: c.isActive,
          createdAt: c.createdAt
        }))

        const mappedCompanies = companiesData.map((c) => ({
          id: c.companyId ?? c.id,
          name: c.name,
          code: c.code
        }))

        setCodes(mappedCodes)
        setCompanies(mappedCompanies)
      } catch (error) {
        console.error('등록 코드/회사 목록 조회 실패:', error)
      }
    }

    fetchData()
  }, [])


  // 기본 역할 선택 옵션
  // - 일반 회사: 고객(CUSTOMER)만 선택 가능
  // - BNF 회사: 매니저 / 엔지니어 / 고객 선택 가능 (시스템 관리자는 노출하지 않음)
  const selectedCompany = companies.find((c) => String(c.id) === String(formData.companyId))
  const isBnfCompanySelected = selectedCompany && selectedCompany.code === BNF_COMPANY_CODE

  const allRoleOptions = [
    USER_ROLES.MANAGER,
    USER_ROLES.ENGINEER,
    USER_ROLES.CUSTOMER
  ].map((value) => ({
    value,
    label: ROLE_LABELS[value] || value
  }))

  const roleOptions = allRoleOptions.filter((opt) => {
    if (!isBnfCompanySelected) {
      // 일반 회사: 고객만 허용
      return opt.value === USER_ROLES.CUSTOMER
    }
    // BNF 회사: 내부 역할 + 고객 허용 (시스템 관리자는 애초에 목록에 넣지 않음)
    return true
  })

  const filteredCodes = codes.filter(c =>
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalCount = filteredCodes.length
  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const currentPageSafe = Math.min(currentPage, totalPages)
  const pagedCodes = filteredCodes.slice(
    (currentPageSafe - 1) * pageSize,
    currentPageSafe * pageSize
  )

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (size) => {
    setPageSize(size)
    setCurrentPage(1)
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }


  const safeCopyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        return true
      }
    } catch (err) {
      console.warn('navigator.clipboard copy failed, falling back...', err)
    }

    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.top = '-1000px'
      textarea.style.left = '-1000px'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      return success
    } catch (err) {
      console.error('Fallback clipboard copy failed', err)
      return false
    }
  }

  const copyToClipboard = async (code, id) => {
    const url = `${window.location.origin}/register?code=${code}`
    const ok = await safeCopyToClipboard(url)
    if (!ok) {
      alert('클립보드 복사에 실패했습니다. 브라우저 설정을 확인해 주세요.')
      return
    }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const copyCodeOnly = async (code, id) => {
    const ok = await safeCopyToClipboard(code)
    if (!ok) {
      alert('클립보드 복사에 실패했습니다. 브라우저 설정을 확인해 주세요.')
      return
    }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const openCreateModal = () => {
    setFormData({
      companyId: '',
      description: '',
      maxUses: '',
      roleDefault: USER_ROLES.CUSTOMER,
      expiresAt: ''
    })
    setShowModal(true)
  }


  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const companyId = parseInt(formData.companyId, 10)
      if (!companyId) {
        alert('회사를 선택해주세요.')
        return
      }

      const payload = {
        companyId,
        description: formData.description || null,
        maxUses: formData.maxUses ? parseInt(formData.maxUses, 10) : null,
        roleDefault: formData.roleDefault,
        expiresAt: formData.expiresAt || null,
        userIsActiveDefault: formData.userIsActiveDefault
      }

      const response = await registrationCodesApi.create(payload)
      const c = response.data || response

      const newCode = {
        id: c.registrationCodeId ?? c.id,
        code: c.code,
        companyName: c.companyName,
        companyId: c.companyId,
        description: c.description || '',
        maxUses: c.maxUses,
        usedCount: c.usedCount,
        roleDefault: c.roleDefault,
        expiresAt: c.expiresAt,
        userIsActiveDefault: c.userIsActiveDefault,
        isActive: c.isActive,
        createdAt: c.createdAt
      }

      setCodes((prev) => [newCode, ...prev])
      setShowModal(false)
    } catch (error) {
      console.error('등록 코드 생성 실패:', error)
    }
  }



  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) {
      setMenuOpen(null)
      return
    }

    try {
      await registrationCodesApi.delete(id)
      setCodes((prev) => prev.filter((c) => c.id !== id))
    } catch (error) {
      console.error('등록 코드 삭제 실패:', error)
    } finally {
      setMenuOpen(null)
    }
  }



  const toggleActive = async (id) => {
    const target = codes.find((c) => c.id === id)
    if (!target) return

    try {
      await registrationCodesApi.update(id, { isActive: !target.isActive })
      setCodes((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, isActive: !c.isActive } : c
        )
      )
    } catch (error) {
      console.error('등록 코드 상태 변경 실패:', error)
    } finally {
      setMenuOpen(null)
    }
  }


  const isExpired = (expiresAt) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const isExhausted = (maxUses, usedCount) => {
    if (maxUses === null) return false
    return usedCount >= maxUses
  }

  const getStatusBadge = (code) => {
    if (!code.isActive) return <span className="badge badge-gray">비활성</span>
    if (isExpired(code.expiresAt)) return <span className="badge badge-red">만료됨</span>
    if (isExhausted(code.maxUses, code.usedCount)) return <span className="badge badge-orange">소진됨</span>
    return <span className="badge badge-green">사용가능</span>
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-bnf-orange/10 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-bnf-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-bnf-dark dark:text-white tracking-tight">등록 코드 관리</h1>
            <p className="text-sm text-bnf-gray dark:text-gray-400 mt-1">고객사 회원가입용 코드 {codes.length}개</p>
          </div>
        </div>
        <button onClick={openCreateModal} className="btn btn-warning">
          <Plus className="w-5 h-5" />
          코드 생성
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bnf-gray dark:text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 focus:border-bnf-orange transition-colors"
            placeholder="코드, 회사명, 설명 검색..."
          />
        </div>
      </div>

      {/* Cards Grid */}
      < div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" >
        <div className="p-4 min-h-96">
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pagedCodes.map((code) => (
              <div
                key={code.id}
                className="bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-bnf-orange/10 dark:bg-bnf-orange/20 rounded-lg flex items-center justify-center">
                      <KeyRound className="w-5 h-5 text-bnf-orange" />
                    </div>
                    {getStatusBadge(code)}
                  </div>

                  <div className="relative">
                    <ActionDropdown>
                      <button
                        onClick={() => { copyToClipboard(code.code, code.id); setMenuOpen(null); }}
                        className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                      >
                        <LinkIcon className="w-4 h-4" />
                        가입 링크 복사
                      </button>
                      <button
                        onClick={() => toggleActive(code.id)}
                        className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                      >
                        {code.isActive ? (
                          <>
                            <X className="w-4 h-4" />
                            비활성화
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            활성화
                          </>
                        )}
                      </button>
                      <hr className="my-2 border-gray-100 dark:border-gray-600/50" />
                      <button
                        onClick={() => handleDelete(code.id)}
                        className="w-full px-4 py-2 text-left text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                      >
                        <Trash2 className="w-4 h-4" />
                        삭제
                      </button>
                    </ActionDropdown>
                  </div>
                </div>

                {/* Code Display */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-lg font-mono font-bold text-bnf-dark dark:text-white tracking-wider">{code.code}</code>
                    <button
                      onClick={() => copyCodeOnly(code.code, code.id)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      title="코드 복사"
                    >
                      {copiedId === code.id ? (
                        <Check className="w-4 h-4 text-green-500 dark:text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-bnf-gray dark:text-gray-500" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-bnf-gray dark:text-gray-400">{code.description}</p>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-bnf-gray dark:text-gray-500">
                      <Building2 className="w-4 h-4" />
                      회사
                    </span>
                    <span className="text-bnf-dark dark:text-gray-300">{code.companyName}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-bnf-gray dark:text-gray-500">
                      <Users className="w-4 h-4" />
                      사용량
                    </span>
                    <span className="text-bnf-dark dark:text-gray-300">
                      {code.usedCount} / {code.maxUses || '∞'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-bnf-gray dark:text-gray-500">
                      <Calendar className="w-4 h-4" />
                      만료일
                    </span>
                    <span className={`${isExpired(code.expiresAt) ? 'text-red-500 dark:text-red-400' : 'text-bnf-dark dark:text-gray-300'}`}>
                      {code.expiresAt || '무제한'}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => copyToClipboard(code.code, code.id)}
                  className="w-full mt-4 px-4 py-2.5 bg-white dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-bnf-dark dark:text-gray-300 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  가입 링크 복사
                </button>
              </div>
            ))}
          </div>

          {filteredCodes.length === 0 && (
            <div className="p-12 text-center">
              <KeyRound className="w-12 h-12 mx-auto mb-3 text-bnf-gray dark:text-gray-600" />
              <p className="text-bnf-gray dark:text-gray-500">등록 코드가 없습니다</p>
              <button onClick={openCreateModal} className="btn btn-warning mt-4">
                <Plus className="w-5 h-5" />
                첫 코드 생성
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {
          filteredCodes.length > 0 && (
            <Pagination
              currentPage={currentPageSafe}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )
        }
      </div >

      {/* Create Modal */}
      {
        showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70" onClick={() => setShowModal(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700/50 animate-scale-in">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700/50">
                <h2 className="text-xl font-display font-bold text-bnf-dark dark:text-white">등록 코드 생성</h2>
                <p className="text-sm text-bnf-gray dark:text-gray-400 mt-1">고객사 회원가입용 코드를 생성합니다</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">회사 선택 *</label>
                  <select
                    value={formData.companyId}
                    onChange={handleCompanyChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
                    required
                  >
                    <option value="">회사를 선택하세요</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">설명</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
                    placeholder="예: 신규 직원용, 관리자 계정용"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">기본 역할</label>
                  <select
                    value={formData.roleDefault}
                    onChange={(e) => setFormData(prev => ({ ...prev, roleDefault: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
                  >
                    {roleOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="inline-flex items-center gap-3 text-sm text-bnf-dark dark:text-gray-300">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/50 text-bnf-orange focus:ring-bnf-orange transition-colors"
                      checked={formData.userIsActiveDefault}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, userIsActiveDefault: e.target.checked }))
                      }
                    />
                    <span>이 코드로 가입 시 계정 자동 활성화</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">최대 사용 횟수</label>
                    <input
                      type="number"
                      value={formData.maxUses}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxUses: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
                      placeholder="무제한"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">만료일</label>
                    <input
                      type="date"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700/50 text-bnf-dark dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-bnf-orange text-white rounded-xl hover:bg-orange-500 transition-colors flex items-center justify-center gap-2 font-medium shadow-orange"
                  >
                    <KeyRound className="w-5 h-5" />
                    코드 생성
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  )
}