import React, { useEffect, useRef, useCallback, memo } from 'react';
import { FiX } from 'react-icons/fi';
import './ScrollableModal.css';

/**
 * ScrollableModal - Production-grade modal with fixed header/footer and scrollable body
 * 
 * Features:
 * - Fixed header with title and close button
 * - Scrollable body that adapts to content height
 * - Fixed footer with action buttons (always visible)
 * - Body scroll lock when modal is open
 * - ESC key to close
 * - Backdrop click to close
 * - Auto-focus on first focusable element
 * - Responsive design (desktop/tablet/mobile)
 * - Smooth animations
 */
const ScrollableModal = memo(({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    footer,
    showFooter = true,
    closeOnBackdrop = true,
    closeOnEsc = true,
}) => {
    const modalRef = useRef(null);
    const contentRef = useRef(null);
    const hasFocused = useRef(false);

    // Size classes mapping
    const sizeClasses = {
        sm: 'scrollable-modal--sm',
        md: 'scrollable-modal--md',
        lg: 'scrollable-modal--lg',
        xl: 'scrollable-modal--xl',
        full: 'scrollable-modal--full',
    };

    // Handle ESC key press
    const handleKeyDown = useCallback((e) => {
        if (closeOnEsc && e.key === 'Escape') {
            onClose();
        }
    }, [closeOnEsc, onClose]);

    // Handle backdrop click
    const handleBackdropClick = useCallback((e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
            onClose();
        }
    }, [closeOnBackdrop, onClose]);

    // Lock body scroll and add event listeners when modal opens
    useEffect(() => {
        if (isOpen) {
            // Lock body scroll
            const originalOverflow = document.body.style.overflow;
            const originalPaddingRight = document.body.style.paddingRight;

            // Calculate scrollbar width to prevent layout shift
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

            document.body.style.overflow = 'hidden';
            if (scrollbarWidth > 0) {
                document.body.style.paddingRight = `${scrollbarWidth}px`;
            }

            // Add ESC key listener
            document.addEventListener('keydown', handleKeyDown);

            // Auto-focus first focusable element ONLY ONCE on open (not on every re-render)
            if (!hasFocused.current) {
                hasFocused.current = true;
                setTimeout(() => {
                    if (contentRef.current) {
                        const focusableElements = contentRef.current.querySelectorAll(
                            'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
                        );
                        if (focusableElements.length > 0) {
                            focusableElements[0].focus();
                        }
                    }
                }, 100);
            }

            // Cleanup function
            return () => {
                document.body.style.overflow = originalOverflow;
                document.body.style.paddingRight = originalPaddingRight;
                document.removeEventListener('keydown', handleKeyDown);
            };
        } else {
            // Reset focus flag when modal closes so next open works correctly
            hasFocused.current = false;
        }
    }, [isOpen, handleKeyDown]);

    // Don't render if not open
    if (!isOpen) return null;

    return (
        <div
            className="scrollable-modal-overlay"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                ref={modalRef}
                className={`scrollable-modal ${sizeClasses[size]}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Fixed Header */}
                <div className="scrollable-modal__header">
                    <h2 id="modal-title" className="scrollable-modal__title">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="scrollable-modal__close-btn"
                        aria-label="Close modal"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div ref={contentRef} className="scrollable-modal__body">
                    {children}
                </div>

                {/* Fixed Footer */}
                {showFooter && footer && (
                    <div className="scrollable-modal__footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
});

ScrollableModal.displayName = 'ScrollableModal';

export default ScrollableModal;
