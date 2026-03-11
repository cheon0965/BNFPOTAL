/**
 * ============================================================================
 * 파일명: AuthLayout.jsx
 * 경로: Frontend/src/components/layout/AuthLayout.jsx
 * 설명: 인증 페이지 레이아웃 - 로그인, 회원가입 전용
 * ----------------------------------------------------------------------------
 * [사용 경로]
 *   /login, /register
 *
 * [디자인]
 *   - 중앙 정렬 카드 형태
 *   - 로고, 브랜드 컬러 적용
 *
 * [참고]
 *   - 로그인 상태에서 접근 시 /dashboard로 리다이렉트 (PublicRoute)
 * ============================================================================
 */

import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-bnf-light via-white to-bnf-light">
      {/* Left Side - Branding / Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-bnf-blue via-blue-600 to-bnf-dark relative overflow-hidden text-white">
        {/* Soft background blobs */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-24 -left-16 w-72 h-72 bg-bnf-green rounded-full blur-3xl" />
          <div className="absolute top-1/3 -right-10 w-80 h-80 bg-bnf-orange rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-10 w-64 h-64 bg-white/40 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between w-full px-12 py-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="BnF SOFT" className="h-12 drop-shadow-lg" />
            <div>
              <p className="break-keep text-sm font-medium tracking-wide text-white/80">ERP 유지보수 포털</p>
              <p className="break-keep text-lg font-semibold">BnF ERP Portal</p>
            </div>
          </div>

          {/* Hero text */}
          <div className="mt-12 w-full animate-slide-up">
            <div className="w-full">
              <h1 className="text-3xl xl:text-4xl font-display font-bold leading-snug break-keep">
                고객사의 <span className="text-bnf-orange">안정적인 ERP 운영</span>을
                위한 한 곳의 창구
              </h1>
              <p className="mt-4 text-sm xl:text-base text-white/80 break-keep">
                유지보수 요청 등록부터 처리 현황까지 한 번에 확인하세요.
                비앤에프소프트의 엔지니어가 신속하게 대응합니다.
              </p>
            </div>

            <div className="mt-8 max-w-xl grid grid-cols-3 gap-4 text-xs xl:text-sm">
              <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 border border-white/10">
                <p className="break-keep font-semibold">실시간 현황</p>
                <p className="break-keep mt-1 text-white/80">진행 중인 요청을 한눈에 확인</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 border border-white/10">
                <p className="break-keep font-semibold">안정적인 운영</p>
                <p className="break-keep mt-1 text-white/80">장애·문의에 대한 신속한 대응</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 border border-white/10">
                <p className="break-keep font-semibold">투명한 이력</p>
                <p className="break-keep mt-1 text-white/80">모든 처리 내역의 이력관리</p>
              </div>
            </div>
          </div>

          {/* Footer text */}
          <div className="mt-10 text-xs text-white/70">
            © {year} 비앤에프소프트. All rights reserved.
          </div>
        </div>

        {/* Subtle bottom wave */}
        <svg
          className="absolute bottom-0 left-0 right-0 opacity-40"
          viewBox="0 0 1440 120"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 96L60 101.3C120 107 240 117 360 112C480 107 600 85 720 80C840 75 960 85 1080 90.7C1200 96 1320 96 1380 96H1440V120H0Z"
            fill="url(#waveGradient)"
          />
          <defs>
            <linearGradient id="waveGradient" x1="0" x2="1440" y1="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" stopOpacity="0.12" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.02" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-md">
          <div className="bg-white/80 backdrop-blur shadow-xl rounded-2xl p-6 sm:p-8 lg:p-10 border border-bnf-light/80 animate-slide-up">
            <Outlet />
          </div>
          <p className="mt-6 text-center text-xs text-bnf-gray lg:hidden">
            © {year} 비앤에프소프트. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}