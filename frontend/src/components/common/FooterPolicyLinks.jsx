import { useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * 푸터에서 사용하는 개인정보처리방침 / 이용약관 링크 + 모달
 * 고객 / 관리자 화면 모두에서 공통으로 사용한다.
 */
export default function FooterPolicyLinks({ linkClassName = '' }) {
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={linkClassName}
          onClick={() => setShowPrivacy(true)}
        >
          개인정보처리방침
        </button>
        <button
          type="button"
          className={linkClassName}
          onClick={() => setShowTerms(true)}
        >
          이용약관
        </button>
      </div>

      {showPrivacy &&
        createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowPrivacy(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">개인정보처리방침</h2>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => setShowPrivacy(false)}
              >
                닫기
              </button>
            </div>
            <div className="space-y-4 text-sm text-gray-700">
              <p>
                비앤에프소프트(이하 "회사")는 ERP 유지보수 포털 서비스(이하 "서비스")를 제공함에 있어
                이용자의 개인정보를 관련 법령과 개인정보 보호규정을 준수하여 안전하게 관리합니다.
              </p>

              <div>
                <p className="font-semibold">1. 수집하는 개인정보 항목</p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>회원 가입 및 계정 관리: 이름, 이메일 주소, 회사명, 연락처, 직책, 로그인 ID</li>
                  <li>서비스 이용 과정에서 자동 수집: 접속 IP, 브라우저 정보, 접속 일시, 서비스 이용 기록 등</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold">2. 개인정보의 이용 목적</p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>서비스 제공 및 유지보수 요청 처리, 고객 지원</li>
                  <li>본인 확인 및 계정 관리, 보안 및 부정 사용 방지</li>
                  <li>서비스 품질 개선 및 통계 분석(개인 식별이 불가능한 형태로 처리)</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold">3. 보유 및 이용 기간</p>
                <p className="mt-1">
                  회사는 관련 법령에서 정한 기간 동안 개인정보를 보관하며, 그 외의 경우 회원 탈퇴 시 또는
                  이용 목적 달성 시 지체 없이 안전한 방법으로 파기합니다.
                </p>
              </div>

              <div>
                <p className="font-semibold">4. 제3자 제공 및 처리위탁</p>
                <p className="mt-1">
                  회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만, 서비스 운영을 위해
                  불가피하게 외부 전문 업체에 처리를 위탁할 수 있으며, 이 경우 개인정보 보호를 위한
                  관리·감독 의무를 이행합니다.
                </p>
              </div>

              <div>
                <p className="font-semibold">5. 이용자의 권리</p>
                <p className="mt-1">
                  이용자는 언제든지 자신의 개인정보 열람·정정·삭제·처리정지 등을 요청할 수 있으며,
                  회사는 법령이 정하는 범위 내에서 지체 없이 조치합니다.
                </p>
              </div>

              <div>
                <p className="font-semibold">6. 문의처</p>
                <p className="mt-1">
                  개인정보 보호 관련 문의, 불만 처리, 피해 구제 등은 회사 대표전화 또는 문의 채널을 통해
                  접수하실 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showTerms &&
      createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowTerms(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">이용약관</h2>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => setShowTerms(false)}
              >
                닫기
              </button>
            </div>
            <div className="space-y-4 text-sm text-gray-700">
              <p>
                본 약관은 비앤에프소프트가 제공하는 ERP 유지보수 포털 서비스의 이용과 관련하여
                회사와 이용자 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.
              </p>

              <div>
                <p className="font-semibold">1. 용어의 정의</p>
                <p className="mt-1">
                  "서비스"란 회사가 제공하는 ERP 유지보수 요청 등록·조회·처리 웹 서비스를 의미하며,
                  "회원"이란 본 약관에 동의하고 서비스를 이용하는 고객사 및 내부 사용자를 말합니다.
                </p>
              </div>

              <div>
                <p className="font-semibold">2. 약관의 효력 및 변경</p>
                <p className="mt-1">
                  본 약관은 서비스 화면에 게시하거나 기타의 방법으로 공지함으로써 효력이 발생합니다.
                  회사는 관련 법령을 위배하지 않는 범위에서 약관을 개정할 수 있으며,
                  개정 시 사전 공지 후 적용합니다.
                </p>
              </div>

              <div>
                <p className="font-semibold">3. 서비스 이용</p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>회원은 부여받은 계정으로 로그인하여 유지보수 요청 등록, 조회 및 관리 기능을 이용할 수 있습니다.</li>
                  <li>서비스 제공 시간, 점검 및 중단에 관한 사항은 서비스 공지 또는 개별 안내에 따릅니다.</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold">4. 회원의 의무</p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>계정 정보(아이디, 비밀번호)를 안전하게 관리하고 제3자에게 양도·대여하지 않습니다.</li>
                  <li>서비스 이용 시 관계 법령 및 본 약관, 안내 사항을 준수해야 합니다.</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold">5. 회사의 의무</p>
                <p className="mt-1">
                  회사는 안정적인 서비스 제공을 위해 최선을 다하며, 개인정보 보호와 보안을 위해 합리적인
                  보호 조치를 취합니다. 단, 불가항력적인 사유로 인한 서비스 장애에 대해서는 법령이 허용하는
                  범위 내에서 책임이 제한될 수 있습니다.
                </p>
              </div>

              <div>
                <p className="font-semibold">6. 서비스 이용 제한</p>
                <p className="mt-1">
                  회사는 회원이 법령 또는 본 약관을 위반하거나 서비스 운영을 방해하는 경우,
                  서비스 이용을 제한하거나 계약을 해지할 수 있습니다.
                </p>
              </div>

              <div>
                <p className="font-semibold">7. 관할 법원</p>
                <p className="mt-1">
                  서비스 이용과 관련하여 회사와 회원 간에 분쟁이 발생할 경우, 관련 법령에 따른 관할 법원을
                  제1심 전속 관할로 합니다.
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
