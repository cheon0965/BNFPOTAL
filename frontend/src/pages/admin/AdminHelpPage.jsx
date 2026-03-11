import React from 'react'
import { FileText, HelpCircle } from 'lucide-react'
import { adminHelpText, buildAdminHelpSections } from './adminHelpData';

export default function AdminHelpPage() {
  const { sections, note } = React.useMemo(
    () => buildAdminHelpSections(adminHelpText),
    []
  );

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-bnf-orange/10 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-bnf-orange" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-bnf-dark dark:text-white tracking-tight">
            관리자 화면 도움말
          </h1>
          <p className="text-sm text-bnf-gray dark:text-gray-400 mt-1">
            ERP 유지보수 포털의 관리자용 화면에서 제공되는 주요 기능과 사용 방법을 정리한 안내입니다.
          </p>
        </div>
      </div>
      <a
        href="/help/erp-help-admin.docx"
        className="inline-flex items-center gap-2 mb-6 btn  rounded-lg border border-bnf-orange text-sm text-bnf-orange hover:bg-bnf-orange/10"
      >
        <FileText className="w-4 h-4" />
        <span>워드 도움말 파일 다운로드</span>
      </a>

      <div className="space-y-4">
        {sections.map((section, index) => (
          <section
            key={section.title + index}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 md:p-6"
          >
            <header className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-base md:text-xl font-semibold text-bnf-dark dark:text-white">
                  {section.title}
                </h2>
                {section.scope && (
                  <p className="mt-1 text-xs md:text-sm text-bnf-gray dark:text-gray-400">
                    {section.scope}
                  </p>
                )}
              </div>
              <span className="inline-flex items-center rounded-full bg-bnf-orange/10 text-bnf-orange px-3 py-1 text-[11px] md:text-xs font-medium">
                섹션 {index + 1}
              </span>
            </header>

            {section.purpose && (
              <p className="text-sm md:text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed">
                <span className="font-semibold">사용 목적</span>{' '}
                {section.purpose}
              </p>
            )}

            {section.stepLines.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wide mb-1">
                  사용 방법
                </p>
                <ul className="space-y-1.5 text-[13px] md:text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {section.stepLines.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </div>
            )}

            {section.bodyLines.length > 0 && (
              <div className="mt-3 space-y-1.5 text-[13px] md:text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                {section.bodyLines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            )}
          </section>
        ))}

        {note && (
          <div className="mt-6 text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-4">
            {note}
          </div>
        )}
      </div>
    </div>
  );
}
