import { useState, useEffect, useRef } from 'react'
import {
  Search,
  Plus,
  Building2,
  Edit3,
  Trash2,
  Users,
  FileText,
  X,
  Check,
  AlertCircle
} from 'lucide-react'

import { companiesApi } from '../../api'
import { Pagination, ActionDropdown } from '../../components/common'

export default function CompanyListPage() {
  const [companies, setCompanies] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)
  const [formData, setFormData] = useState({ name: '', code: '', phoneNumber: '', isActive: true })
  const [menuOpen, setMenuOpen] = useState(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const menuButtonRefs = useRef({})
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' })

  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await companiesApi.getAll()
        const data = response.data || []

        const mapped = data.map((c) => ({
          id: c.companyId ?? c.id,
          name: c.name,
          code: c.code,
          phoneNumber: c.phoneNumber || '',
          isActive: c.isActive,
          usersCount: c.usersCount ?? c.UsersCount ?? 0,
          requestsCount: c.requestsCount ?? c.RequestsCount ?? 0,
          createdAt: c.createdAt ? String(c.createdAt).split('T')[0] : ''
        }))

        setCompanies(mapped)
      } catch (error) {
        console.error('회사 목록 조회 실패:', error)
      }
    }

    fetchCompanies()
  }, [])

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 정렬 처리
  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (sortConfig.key === 'isActive') {
      aValue = a.isActive ? 1 : 0;
      bValue = b.isActive ? 1 : 0;
    } else if (sortConfig.key === 'usersCount' || sortConfig.key === 'requestsCount') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    } else {
      aValue = aValue === null || aValue === undefined ? '' : String(aValue);
      bValue = bValue === null || bValue === undefined ? '' : String(bValue);
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // 페이징 처리
  const totalCount = sortedCompanies.length
  const totalPages = Math.ceil(totalCount / pageSize)
  const paginatedCompanies = sortedCompanies.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // 검색어 변경 및 정렬 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortConfig])

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (size) => {
    setPageSize(size)
    setCurrentPage(1)
  }

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = '';
      key = '';
    }
    setSortConfig({ key, direction });
  }

  const openCreateModal = () => {
    setEditingCompany(null)
    setFormData({ name: '', code: '', phoneNumber: '', isActive: true })
    setShowModal(true)
  }

  const openEditModal = (company) => {
    setEditingCompany(company)
    setFormData({ name: company.name, code: company.code, phoneNumber: company.phoneNumber || '', isActive: company.isActive })
    setShowModal(true)
    setMenuOpen(null)
  }

  const handleMenuOpen = (companyId) => {
    if (menuOpen === companyId) {
      setMenuOpen(null)
      return
    }

    const buttonEl = menuButtonRefs.current[companyId]
    if (buttonEl) {
      const rect = buttonEl.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.right - 192 // 메뉴 너비 192px (w-48)
      })
    }
    setMenuOpen(companyId)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingCompany) {
        await companiesApi.update(editingCompany.id, {
          name: formData.name,
          code: formData.code,
          phoneNumber: formData.phoneNumber,
          isActive: formData.isActive
        })

        setCompanies(prev =>
          prev.map((c) =>
            c.id === editingCompany.id ? { ...c, ...formData } : c
          )
        )
      } else {
        const response = await companiesApi.create({
          name: formData.name,
          code: formData.code,
          phoneNumber: formData.phoneNumber,
          isActive: formData.isActive
        })

        const c = response.data
        const newCompany = {
          id: c.companyId ?? c.id,
          name: c.name,
          code: c.code,
          phoneNumber: c.phoneNumber || '',
          isActive: c.isActive,
          usersCount: c.usersCount ?? c.UsersCount ?? 0,
          requestsCount: c.requestsCount ?? c.RequestsCount ?? 0,
          createdAt: c.createdAt ? String(c.createdAt).split('T')[0] : ''
        }

        setCompanies((prev) => [...prev, newCompany])
      }
      setShowModal(false)
    } catch (error) {
      console.error('회사 저장 실패:', error)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) {
      setMenuOpen(null)
      return
    }

    try {
      await companiesApi.delete(id)
      setCompanies((prev) => prev.filter((c) => c.id !== id))
    } catch (error) {
      console.error('회사 삭제 실패:', error)
    } finally {
      setMenuOpen(null)
    }
  }

  const toggleActive = async (id) => {
    const target = companies.find((c) => c.id === id)
    if (!target) return

    try {
      await companiesApi.update(id, { isActive: !target.isActive })
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, isActive: !c.isActive } : c
        )
      )
    } catch (error) {
      console.error('회사 상태 변경 실패:', error)
    } finally {
      setMenuOpen(null)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-bnf-orange/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-bnf-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-bnf-dark dark:text-white tracking-tight">회사 관리</h1>
            <p className="text-sm text-bnf-gray dark:text-gray-400 mt-1">등록된 고객사 {companies.length}개</p>
          </div>
        </div>
        <button onClick={openCreateModal} className="btn btn-warning">
          <Plus className="w-5 h-5" />
          회사 추가
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bnf-gray dark:text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 focus:border-bnf-orange transition-colors"
            placeholder="회사명 또는 코드 검색..."
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* PC Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th onClick={() => handleSort('name')} className="px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                  회사명 {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('code')} className="px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                  코드 {sortConfig.key === 'code' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('usersCount')} className="text-center px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                  사용자 {sortConfig.key === 'usersCount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('requestsCount')} className="text-center px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                  요청 {sortConfig.key === 'requestsCount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('isActive')} className="text-center px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                  상태 {sortConfig.key === 'isActive' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('createdAt')} className="px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                  등록일 {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {paginatedCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-bnf-blue/10 dark:bg-bnf-blue/20 rounded-xl flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-bnf-blue" />
                      </div>
                      <span className="font-medium text-bnf-dark dark:text-white">{company.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm text-bnf-dark dark:text-gray-300 font-mono tracking-wider">{company.code}</code>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-bnf-gray dark:text-gray-300">
                      <Users className="w-4 h-4 text-bnf-gray dark:text-gray-500" />
                      {company.usersCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-bnf-gray dark:text-gray-300">
                      <FileText className="w-4 h-4 text-bnf-gray dark:text-gray-500" />
                      {company.requestsCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {company.isActive ? (
                      <span className="badge badge-green">활성</span>
                    ) : (
                      <span className="badge badge-gray">비활성</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-bnf-gray dark:text-gray-400 text-sm">{company.createdAt}</td>
                  <td className="px-6 py-4 text-center">
                    <ActionDropdown>
                      <button
                        onClick={() => openEditModal(company)}
                        className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                      >
                        <Edit3 className="w-4 h-4" />
                        수정
                      </button>
                      <button
                        onClick={() => toggleActive(company.id)}
                        className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                      >
                        {company.isActive ? (
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
                      {company.code !== 'BNFSOFT' && (
                        <>
                          <hr className="my-2 border-gray-100 dark:border-gray-700/50" />
                          <button
                            onClick={() => handleDelete(company.id)}
                            className="w-full px-4 py-2 text-left text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                          >
                            <Trash2 className="w-4 h-4" />
                            삭제
                          </button>
                        </>
                      )}
                    </ActionDropdown>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700/50">
          {paginatedCompanies.map((company) => (
            <div key={company.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              {/* Header: Icon + Name + Menu */}
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-bnf-blue/10 dark:bg-bnf-blue/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-bnf-blue" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-bnf-dark dark:text-white">{company.name}</span>
                    <div className="mt-0.5">
                      <code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-bnf-dark dark:text-gray-300 font-mono tracking-wider">{company.code}</code>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 relative">
                  {company.isActive ? (
                    <span className="badge badge-green">활성</span>
                  ) : (
                    <span className="badge badge-gray">비활성</span>
                  )}
                  <ActionDropdown>
                    <button
                      onClick={() => openEditModal(company)}
                      className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                    >
                      <Edit3 className="w-4 h-4" />
                      수정
                    </button>
                    <button
                      onClick={() => toggleActive(company.id)}
                      className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                    >
                      {company.isActive ? (
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
                    {company.code !== 'BNFSOFT' && (
                      <>
                        <hr className="my-2 border-gray-100 dark:border-gray-700/50" />
                        <button
                          onClick={() => handleDelete(company.id)}
                          className="w-full px-4 py-2 text-left text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                        >
                          <Trash2 className="w-4 h-4" />
                          삭제
                        </button>
                      </>
                    )}
                  </ActionDropdown>
                </div>
              </div>
              {/* Footer */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center gap-4 text-sm text-bnf-gray dark:text-gray-400">
                  <span className="inline-flex items-center justify-center gap-1.5 px-2 py-0.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-bnf-gray dark:text-gray-400">
                    <Users className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                    {company.usersCount}명
                  </span>
                  <span className="inline-flex items-center justify-center gap-1.5 px-2 py-0.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-bnf-gray dark:text-gray-400">
                    <FileText className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                    {company.requestsCount}건
                  </span>
                </div>
                <span className="text-xs text-bnf-gray dark:text-gray-500 font-medium">{company.createdAt}</span>
              </div>
            </div>
          ))}
        </div>

        {sortedCompanies.length === 0 && (
          <div className="p-16 text-center text-bnf-gray dark:text-gray-400">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-1">
                <Building2 className="w-6 h-6 text-bnf-gray dark:text-gray-500 opacity-50" />
              </div>
              <p className="text-base text-bnf-dark dark:text-gray-300 font-medium">등록된 회사가 없습니다</p>
              <p className="text-sm text-bnf-gray dark:text-gray-500">새로운 회사를 추가해 보세요.</p>
            </div>
          </div>
        )}

        {/* 페이지네이션 */}
        {sortedCompanies.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>


      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700/50 animate-scale-in">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700/50">
              <h2 className="text-xl font-display font-bold text-bnf-dark dark:text-white">
                {editingCompany ? '회사 수정' : '회사 추가'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">회사명 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
                  placeholder="회사명 입력"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">회사 코드 *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 font-mono transition-colors"
                  placeholder="COMPANY01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">전화번호</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
                  placeholder="02-1234-5678"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-bnf-orange focus:ring-bnf-orange bg-white dark:bg-gray-900/50 transition-colors"
                />
                <label htmlFor="isActive" className="text-bnf-dark dark:text-gray-300">활성 상태</label>
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
                  className="flex-1 px-4 py-3 bg-bnf-orange text-white rounded-xl hover:bg-orange-500 transition-colors font-medium shadow-orange"
                >
                  {editingCompany ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
