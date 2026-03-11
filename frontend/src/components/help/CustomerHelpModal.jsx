import React from 'react'
import { X, FileText } from 'lucide-react'
import { customerHelpText, buildCustomerHelpSections } from '../../pages/help/customerHelpData'

function getCustomerHelpSectionTitle(pathname) {
  if (!pathname) return null;

  // 정확한 매칭 우선
  if (pathname === '/dashboard' || pathname === '/') return '대시보드 페이지';
  if (pathname === '/requests/new') return '요청 등록 페이지';
  if (pathname === '/requests') return '요청 목록 페이지';
  if (pathname === '/profile') return '프로필 페이지';
  if (pathname === '/notices') return '공지사항 목록 페이지';

  // 패턴 기반 매칭
  if (pathname.startsWith('/requests/')) return '요청 상세 페이지';
  if (pathname.startsWith('/notices/')) return '공지사항 상세 페이지';

  return null;
}

export function getCustomerHelpForPath(pathname) {
  const { sections, note } = buildCustomerHelpSections(customerHelpText);
  const title = getCustomerHelpSectionTitle(pathname);

  if (!title) {
    return { section: null, note };
  }

  const section = sections.find((s) => s.title === title) || null;
  return { section, note };
}

export default function CustomerHelpModal({ isOpen, onClose, pathname }) {
  const { section } = React.useMemo(
    () => getCustomerHelpForPath(pathname),
    [pathname]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-elevated border border-gray-100 dark:border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <header className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-bnf-blue" />
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
            고객 화면 도움말
          </span>
          <a
            href="/help/erp-help-customer.docx"
            className="inline-flex items-center gap-1 text-xs text-bnf-blue dark:text-blue-400 hover:underline"
          >
            <FileText className="w-3 h-3" />
            <span>전체 도움말 다운로드</span>
          </a>
        </div>
      </div>
    </div>
  );
}
