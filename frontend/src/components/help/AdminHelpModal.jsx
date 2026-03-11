import React from 'react'
import { X, FileText } from 'lucide-react'
import { adminHelpText, buildAdminHelpSections } from '../../pages/admin/adminHelpData'

function getAdminHelpSectionTitle(pathname) {
  if (!pathname) return null;

  // /admin 기준으로 들어온다고 가정
  // index (대시보드)
  if (pathname === '/admin' || pathname === '/admin/') return '관리자 대시보드 페이지';

  if (pathname.startsWith('/admin/requests')) return '요청 관리 페이지';
  if (pathname.startsWith('/admin/companies')) return '회사 관리 페이지';
  if (pathname.startsWith('/admin/users')) return '사용자 관리 페이지';
  if (pathname.startsWith('/admin/erp-systems')) return 'ERP 시스템 관리 페이지';
  if (pathname.startsWith('/admin/registration-codes')) return '등록 코드 관리 페이지';
  if (pathname.startsWith('/admin/notices/new') || (pathname.startsWith('/admin/notices/') && pathname.endsWith('/edit'))) {
    return '공지 작성/수정 페이지';
  }
  if (pathname.startsWith('/admin/notices')) return '공지사항 관리 페이지';
  if (pathname.startsWith('/admin/email-templates')) return '이메일 템플릿 관리 페이지';
  if (pathname.startsWith('/admin/email-settings')) return '메일 서버 설정 페이지';

  // 업무 지시 관련 페이지
  if (pathname === '/admin/tasks/new') return '업무 지시 작성 페이지';
  if (/^\/admin\/tasks\/\d+\/edit$/.test(pathname)) return '업무 지시 수정 페이지';
  if (/^\/admin\/tasks\/\d+$/.test(pathname)) return '업무 지시 상세 페이지';
  if (pathname.startsWith('/admin/tasks')) return '업무 지시 목록 페이지';

  // 시스템 로그
  if (pathname.startsWith('/admin/logs')) return '시스템 로그 페이지';

  return null;
}

export function getAdminHelpForPath(pathname) {
  const { sections, note } = buildAdminHelpSections(adminHelpText);
  const title = getAdminHelpSectionTitle(pathname);

  if (!title) {
    return { section: null, note };
  }

  const section = sections.find((s) => s.title === title) || null;
  return { section, note };
}

export default function AdminHelpModal({ isOpen, onClose, pathname }) {
  const { section } = React.useMemo(
    () => getAdminHelpForPath(pathname),
    [pathname]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-elevated border border-gray-100 dark:border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <header className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-bnf-orange" />
            <h2 className="text-sm md:text-base font-semibold text-bnf-dark dark:text-gray-100">
              {section?.title || '도움말'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4 text-bnf-gray dark:text-gray-400" />
          </button>
        </header>

        <div className="p-4 overflow-y-auto text-[13px] md:text-sm leading-relaxed text-bnf-dark dark:text-gray-100">
          {section ? (
            <>
              {section.scope && (
                <p className="text-xs md:text-[13px] text-bnf-gray dark:text-gray-400 mb-2">
                  {section.scope}
                </p>
              )}

              {section.purpose && (
                <p className="mb-3">
                  <span className="font-semibold">사용 목적</span>{' '}
                  {section.purpose}
                </p>
              )}

              {section.stepLines.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] md:text-xs font-semibold text-bnf-gray dark:text-gray-400 tracking-wide mb-1">
                    사용 방법
                  </p>
                  <ul className="space-y-1.5">
                    {section.stepLines.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}

              {section.bodyLines.length > 0 && (
                <div className="space-y-1.5">
                  {section.bodyLines.map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-bnf-gray dark:text-gray-400 text-sm">
              이 화면에 대한 도움말이 아직 준비되지 않았습니다.
            </p>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <span className="text-[11px] text-bnf-gray dark:text-gray-400">
            관리자 화면 도움말
          </span>
          <a
            href="/help/erp-help-admin.docx"
            className="inline-flex items-center gap-1 text-xs text-bnf-orange dark:text-orange-400 hover:underline"
          >
            <FileText className="w-3 h-3" />
            <span>전체 도움말 다운로드</span>
          </a>
        </div>
      </div>
    </div>
  );
}
