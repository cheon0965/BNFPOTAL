import React from 'react';

/**
 * ============================================================================
 * 파일명: ErrorBoundary.jsx
 * 경로: Frontend/src/components/common/ErrorBoundary.jsx
 * 설명: React Error Boundary 컴포넌트
 *       React Tree 하위 컴포넌트에서 발생하는 자바스크립트 에러를 포착합니다.
 *       특히 Code Splitting(Lazy Loading) 환경에서 새 버전 배포 시 
 *       사용자가 과거 버전의 캐시를 가지고 있어 발생하는 ChunkLoadError를
 *       감지하고 페이지를 자동으로 새로고침하여 최신 버전을 받아오도록 합니다.
 * ============================================================================
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // 다음 렌더링에서 폴백 UI가 보이도록 상태를 업데이트 합니다.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // ChunkLoadError 감지 시 (새로운 배포로 인해 기존 청크 파일을 찾을 수 없는 경우)
    if (error.name === 'ChunkLoadError' || (error.message && error.message.includes('Loading chunk'))) {
      const isRetrying = window.sessionStorage.getItem('chunk-error-retry');
      
      if (!isRetrying) {
        // 무한 새로고침 방지를 위해 세션 스토리지에 플래그 설정
        window.sessionStorage.setItem('chunk-error-retry', 'true');
        // 강제 새로고침하여 최신 에셋을 서버로부터 다시 받아오게 함
        window.location.reload(true);
      } else {
        console.error('Failed to load chunk even after retry. App might be broken.', error, errorInfo);
        // 필요시 에러 리포팅 서비스에 기록 가능
      }
    } else {
      console.error('React ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  componentWillUnmount() {
    // 컴포넌트가 언마운트될 때 (성공적으로 로드되거나 페이지 이탈 시) 재시도 플래그 초기화
    window.sessionStorage.removeItem('chunk-error-retry');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col px-4">
          <div className="bg-white p-8 rounded-xl shadow-lg border border-red-100 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">화면을 불러오는데 문제가 발생했습니다.</h2>
            <p className="text-gray-600 mb-6">
              시스템이 업데이트 되었거나 일시적인 네트워크 오류일 수 있습니다.
              새로고침 버튼을 눌러주세요.
            </p>
            <button
              onClick={() => {
                window.sessionStorage.removeItem('chunk-error-retry');
                window.location.reload(true);
              }}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              화면 새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
