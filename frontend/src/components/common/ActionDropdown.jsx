import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

/**
 * 그리드 내비게이션/액션 드롭다운 컴포넌트
 *
 * 부모 컨테이너(overflow: hidden/auto 등)에 의해 팝업 메뉴가 잘리는 문제를 방지하기 위해
 * React Portal을 활용하여 body 최상단에 마운트하며, 버튼 요소를 기준으로 절대 좌표를 계산합니다.
 * 열릴 때 뷰포트 공간을 확인하여 좌측/우측, 상단/하단 방향을 자동으로 결정합니다.
 */
export default function ActionDropdown({ children }) {
    const [isOpen, setIsOpen] = useState(false);
    const [positioned, setPositioned] = useState(false);
    const [style, setStyle] = useState({});
    const buttonRef = useRef(null);
    const menuRef = useRef(null);

    const MENU_MIN_WIDTH = 192; // 12rem
    const GAP = 4; // 버튼과 메뉴 사이 간격

    // 버튼의 위치를 기준으로 최적의 팝업 좌표를 계산
    const calcPosition = useCallback((btnRect, menuWidth, menuHeight) => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // 수평 방향 결정
        const spaceLeft = btnRect.right;
        const spaceRight = viewportWidth - btnRect.left;

        let left;
        if (spaceLeft >= menuWidth) {
            left = btnRect.right + window.scrollX - menuWidth;
        } else if (spaceRight >= menuWidth) {
            left = btnRect.left + window.scrollX;
        } else {
            left = viewportWidth + window.scrollX - menuWidth - 8;
        }

        // 수직 방향 결정
        let top;
        const spaceBelow = viewportHeight - btnRect.bottom;
        const spaceAbove = btnRect.top;

        if (spaceBelow >= menuHeight + GAP) {
            top = btnRect.bottom + window.scrollY + GAP;
        } else if (spaceAbove >= menuHeight + GAP) {
            top = btnRect.top + window.scrollY - menuHeight - GAP;
        } else {
            top = Math.max(window.scrollY + 8, btnRect.bottom + window.scrollY + GAP);
        }

        return {
            position: 'absolute',
            top: `${top}px`,
            left: `${left}px`,
            zIndex: 9999,
        };
    }, []);

    // 스크롤/리사이즈 시 위치 갱신
    const updatePosition = useCallback(() => {
        if (!buttonRef.current || !isOpen) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const menuEl = menuRef.current;
        const menuWidth = menuEl ? menuEl.offsetWidth : MENU_MIN_WIDTH;
        const menuHeight = menuEl ? menuEl.offsetHeight : 200;
        setStyle(calcPosition(rect, menuWidth, menuHeight));
    }, [isOpen, calcPosition]);

    // 클릭 시: 위치를 먼저 계산한 뒤 열기
    const handleToggle = useCallback((e) => {
        e.stopPropagation();
        if (isOpen) {
            setIsOpen(false);
            setPositioned(false);
            return;
        }
        // 열기 전에 버튼 위치로 초기 좌표 계산 (메뉴 크기는 추정값 사용)
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setStyle(calcPosition(rect, MENU_MIN_WIDTH, 200));
        }
        setPositioned(false);
        setIsOpen(true);
    }, [isOpen, calcPosition]);

    useEffect(() => {
        if (isOpen) {
            // 메뉴가 렌더된 후 실제 크기로 위치 보정 + opacity 표시
            requestAnimationFrame(() => {
                updatePosition();
                setPositioned(true);
            });

            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);

            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen, updatePosition]);

    // 외부 영역 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(e.target)
            ) {
                setIsOpen(false);
                setPositioned(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // 하위 자식요소(버튼들)가 클릭되었을 때 자동으로 메뉴를 닫아주는 로직
    const handleMenuClick = () => {
        setIsOpen(false);
        setPositioned(false);
    };

    return (
        <div className="relative inline-block text-left">
            <button
                ref={buttonRef}
                onClick={handleToggle}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <MoreVertical className="w-5 h-5 text-bnf-gray dark:text-gray-400" />
            </button>

            {isOpen &&
                createPortal(
                    <div
                        ref={menuRef}
                        style={{
                            ...style,
                            opacity: positioned ? 1 : 0,
                            transition: 'opacity 0.08s ease-in',
                        }}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-[12rem]"
                        onClick={handleMenuClick}
                    >
                        {children}
                    </div>,
                    document.body
                )}
        </div>
    );
}

