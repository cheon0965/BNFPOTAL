import { useState, useEffect, useRef } from 'react'
import {
    Search,
    Plus,
    Server,
    Edit3,
    Trash2,
    Building2,
    X,
    Check
} from 'lucide-react'

import { erpSystemsApi, companiesApi } from '../../api'
import { Pagination, ActionDropdown } from '../../components/common'

export default function ErpSystemListPage() {
    const [erpSystems, setErpSystems] = useState([])
    const [companies, setCompanies] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingSystem, setEditingSystem] = useState(null)
    const [formData, setFormData] = useState({
        companyId: '',
        name: '',
        version: '',
        description: '',
        isActive: true
    })
    const [error, setError] = useState('')
    const [menuOpen, setMenuOpen] = useState(null)
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
    const menuButtonRefs = useRef({})
    const [sortConfig, setSortConfig] = useState({ key: '', direction: '' })

    // 페이징 상태
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(5)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [systemsRes, companiesRes] = await Promise.all([
                    erpSystemsApi.getAll(),
                    companiesApi.getAll()
                ])

                setErpSystems(systemsRes.data.map(s => ({
                    id: s.erpSystemId,
                    companyId: s.companyId,
                    companyName: companiesRes.data.find(c => c.companyId === s.companyId)?.name || '-',
                    name: s.name,
                    version: s.version || '',
                    description: s.description || '',
                    isActive: s.isActive
                })))

                setCompanies(companiesRes.data.map(c => ({
                    id: c.companyId,
                    name: c.name
                })))
            } catch (error) {
                console.error('데이터 조회 실패:', error)
            }
        }

        fetchData()
    }, [])

    const filteredSystems = erpSystems.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.version && s.version.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    // 정렬 처리
    const sortedSystems = [...filteredSystems].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'isActive') {
            aValue = a.isActive ? 1 : 0;
            bValue = b.isActive ? 1 : 0;
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
    const totalCount = sortedSystems.length
    const totalPages = Math.ceil(totalCount / pageSize)
    const paginatedSystems = sortedSystems.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    )

    // 검색어 및 정렬 변경 시 첫 페이지로 이동
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
        setEditingSystem(null)
        setFormData({ companyId: '', name: '', version: '', description: '', isActive: true })
        setError('')
        setShowModal(true)
    }

    const openEditModal = (system) => {
        setEditingSystem(system)
        setFormData({
            companyId: system.companyId,
            name: system.name,
            version: system.version,
            description: system.description,
            isActive: system.isActive
        })
        setError('')
        setShowModal(true)
        setMenuOpen(null)
    }

    const handleMenuOpen = (systemId) => {
        if (menuOpen === systemId) {
            setMenuOpen(null)
            return
        }

        const buttonEl = menuButtonRefs.current[systemId]
        if (buttonEl) {
            const rect = buttonEl.getBoundingClientRect()
            setMenuPosition({
                top: rect.bottom + 8,
                left: rect.right - 192
            })
        }
        setMenuOpen(systemId)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!formData.companyId) {
            setError('회사를 선택해주세요.')
            return
        }

        try {
            if (editingSystem) {
                await erpSystemsApi.update(editingSystem.id, {
                    name: formData.name,
                    version: formData.version,
                    description: formData.description,
                    isActive: formData.isActive
                })

                const companyName = companies.find(c => c.id === Number(formData.companyId))?.name || '-'
                setErpSystems(prev =>
                    prev.map((s) =>
                        s.id === editingSystem.id
                            ? { ...s, ...formData, companyId: Number(formData.companyId), companyName }
                            : s
                    )
                )
            } else {
                const response = await erpSystemsApi.create({
                    companyId: Number(formData.companyId),
                    name: formData.name,
                    version: formData.version || null,
                    description: formData.description || null
                })

                const s = response.data
                const companyName = companies.find(c => c.id === s.companyId)?.name || '-'
                const newSystem = {
                    id: s.erpSystemId,
                    companyId: s.companyId,
                    companyName,
                    name: s.name,
                    version: s.version || '',
                    description: s.description || '',
                    isActive: s.isActive
                }

                setErpSystems((prev) => [...prev, newSystem])
            }
            setShowModal(false)
        } catch (error) {
            console.error('ERP 시스템 저장 실패:', error)
            setError(error.response?.data?.message || '저장에 실패했습니다.')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('정말 삭제하시겠습니까?')) {
            setMenuOpen(null)
            return
        }

        try {
            await erpSystemsApi.delete(id)
            setErpSystems((prev) => prev.filter((s) => s.id !== id))
        } catch (error) {
            console.error('ERP 시스템 삭제 실패:', error)
            alert(error.response?.data?.message || '삭제에 실패했습니다.')
        } finally {
            setMenuOpen(null)
        }
    }

    const toggleActive = async (id) => {
        const target = erpSystems.find((s) => s.id === id)
        if (!target) return

        try {
            await erpSystemsApi.update(id, { isActive: !target.isActive })
            setErpSystems((prev) =>
                prev.map((s) =>
                    s.id === id ? { ...s, isActive: !s.isActive } : s
                )
            )
        } catch (error) {
            console.error('ERP 시스템 상태 변경 실패:', error)
        } finally {
            setMenuOpen(null)
        }
    }

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-bnf-orange/10 flex items-center justify-center">
                        <Server className="w-5 h-5 text-bnf-orange" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-bnf-dark dark:text-white tracking-tight">ERP 시스템 관리</h1>
                        <p className="text-sm text-bnf-gray dark:text-gray-400 mt-1">등록된 ERP 시스템 {erpSystems.length}개</p>
                    </div>
                </div>
                <button onClick={openCreateModal} className="btn btn-warning">
                    <Plus className="w-5 h-5" />
                    시스템 추가
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
                        placeholder="시스템명, 회사, 버전 검색..."
                    />
                </div>
            </div>

            {/* Table */}
            < div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" >
                {/* PC Table View */}
                < div className="hidden md:block overflow-x-auto" >
                    <table className="w-full whitespace-nowrap text-left">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <th onClick={() => handleSort('name')} className="px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                                    시스템명 {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('companyName')} className="px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                                    회사 {sortConfig.key === 'companyName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('version')} className="px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                                    버전 {sortConfig.key === 'version' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('isActive')} className="text-center px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-bnf-orange transition-colors select-none">
                                    상태 {sortConfig.key === 'isActive' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="text-center px-6 py-4 text-xs font-semibold text-bnf-gray dark:text-gray-400 uppercase tracking-wider">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {paginatedSystems.map((system) => (
                                <tr key={system.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/20 rounded-xl flex items-center justify-center">
                                                <Server className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <div>
                                                <span className="font-medium text-bnf-dark dark:text-white">{system.name}</span>
                                                {system.description && (
                                                    <p className="text-sm text-bnf-gray dark:text-gray-500 mt-0.5 truncate max-w-xs">
                                                        {system.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="flex items-center gap-2 text-bnf-dark dark:text-gray-300">
                                            <Building2 className="w-4 h-4 text-bnf-gray dark:text-gray-500" />
                                            {system.companyName}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {system.version ? (
                                            <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm text-bnf-dark dark:text-gray-300 font-mono tracking-wider">
                                                v{system.version}
                                            </code>
                                        ) : (
                                            <span className="text-bnf-gray dark:text-gray-500">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {system.isActive ? (
                                            <span className="badge badge-green">활성</span>
                                        ) : (
                                            <span className="badge badge-gray">비활성</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <ActionDropdown>
                                            <button
                                                onClick={() => openEditModal(system)}
                                                className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                                수정
                                            </button>
                                            <button
                                                onClick={() => toggleActive(system.id)}
                                                className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                                            >
                                                {system.isActive ? (
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
                                            <hr className="my-2 border-gray-100 dark:border-gray-700/50" />
                                            <button
                                                onClick={() => handleDelete(system.id)}
                                                className="w-full px-4 py-2 text-left text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                삭제
                                            </button>
                                        </ActionDropdown>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div >

                {/* Mobile Card View */}
                < div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700/50" >
                    {
                        paginatedSystems.map((system) => (
                            <div key={system.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                {/* Header: Icon + Name + Menu */}
                                <div className="flex items-start justify-between gap-3 mb-2.5">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Server className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="font-medium text-bnf-dark dark:text-white">{system.name}</span>
                                            {system.description && (
                                                <p className="text-sm text-bnf-gray dark:text-gray-500 mt-0.5 truncate">{system.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 relative">
                                        {system.isActive ? (
                                            <span className="badge badge-green">활성</span>
                                        ) : (
                                            <span className="badge badge-gray">비활성</span>
                                        )}
                                        <ActionDropdown>
                                            <button
                                                onClick={() => openEditModal(system)}
                                                className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                                수정
                                            </button>
                                            <button
                                                onClick={() => toggleActive(system.id)}
                                                className="w-full px-4 py-2 text-left text-sm text-bnf-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                                            >
                                                {system.isActive ? (
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
                                            <hr className="my-2 border-gray-100 dark:border-gray-700/50" />
                                            <button
                                                onClick={() => handleDelete(system.id)}
                                                className="w-full px-4 py-2 text-left text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2.5 transition-colors whitespace-nowrap"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                삭제
                                            </button>
                                        </ActionDropdown>
                                    </div>
                                </div>
                                {/* Footer */}
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                                    <span className="flex items-center gap-1.5 text-sm text-bnf-gray dark:text-gray-400">
                                        <Building2 className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                                        {system.companyName}
                                    </span>
                                    {system.version ? (
                                        <code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-bnf-dark dark:text-gray-300 font-mono tracking-wider">v{system.version}</code>
                                    ) : (
                                        <span className="text-bnf-gray dark:text-gray-500 text-xs">-</span>
                                    )}
                                </div>
                            </div>
                        ))
                    }
                </div >

                {
                    sortedSystems.length === 0 && (
                        <div className="p-16 text-center text-bnf-gray dark:text-gray-400">
                            <div className="flex flex-col items-center justify-center gap-3">
                                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-1">
                                    <Server className="w-6 h-6 text-bnf-gray dark:text-gray-500 opacity-50" />
                                </div>
                                <p className="text-base text-bnf-dark dark:text-gray-300 font-medium">등록된 ERP 시스템이 없습니다</p>
                                <p className="text-sm text-bnf-gray dark:text-gray-500">새로운 시스템을 추가해 보세요.</p>
                            </div>
                        </div>
                    )
                }

                {/* 페이지네이션 */}
                {
                    sortedSystems.length > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalCount={totalCount}
                            pageSize={pageSize}
                            onPageChange={handlePageChange}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    )
                }
            </div >



            {/* Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-black/70" onClick={() => setShowModal(false)} />
                        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700/50 animate-scale-in">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700/50">
                                <h2 className="text-xl font-display font-bold text-bnf-dark dark:text-white">
                                    {editingSystem ? 'ERP 시스템 수정' : 'ERP 시스템 추가'}
                                </h2>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">회사 *</label>
                                    <select
                                        value={formData.companyId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, companyId: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
                                        required
                                        disabled={!!editingSystem}
                                    >
                                        <option value="">회사 선택</option>
                                        {companies.map(company => (
                                            <option key={company.id} value={company.id}>{company.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">시스템명 *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors"
                                        placeholder="BnF ERP Pro"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">버전</label>
                                    <input
                                        type="text"
                                        value={formData.version}
                                        onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 transition-colors font-mono"
                                        placeholder="3.2.1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-bnf-dark dark:text-gray-300 mb-2">설명</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-bnf-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bnf-orange/50 resize-none transition-colors"
                                        placeholder="시스템 설명..."
                                        rows={3}
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
                                        className="flex-1 px-4 py-3 bg-bnf-orange text-white rounded-xl hover:bg-orange-500 transition-colors flex items-center justify-center gap-2 font-medium shadow-orange"
                                    >
                                        <Server className="w-5 h-5" />
                                        {editingSystem ? '수정' : '추가'}
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
