import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiAlertTriangle,
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiHelpCircle,
  FiX
} from 'react-icons/fi';
import './ConfirmModal.css';

/**
 * Returns default icon for a modal type
 */
const getDefaultIcon = (type) => {
  switch (type) {
    case 'danger':
      return <FiAlertTriangle />;
    case 'warning':
      return <FiAlertCircle />;
    case 'success':
      return <FiCheckCircle />;
    case 'info':
    case 'default':
    default:
      return <FiHelpCircle />;
  }
};

/**
 * Returns default title for a modal type
 */
const getDefaultTitle = (type, isAlert) => {
  if (isAlert) {
    switch (type) {
      case 'danger':
        return 'Attention';
      case 'warning':
        return 'Warning';
      case 'success':
        return 'Success';
      case 'info':
      case 'default':
      default:
        return 'Information';
    }
  }

  switch (type) {
    case 'danger':
      return 'Confirm Action';
    case 'warning':
      return 'Are you sure?';
    case 'success':
      return 'Confirm';
    case 'info':
    case 'default':
    default:
      return 'Confirmation';
  }
};

const ConfirmModal = ({
  isOpen = false,
  onClose,
  onConfirm,
  title,
  message,
  type = 'default', // 'danger' | 'warning' | 'info' | 'success' | 'default'
  confirmText,
  cancelText = 'Cancel',
  isAlert = false,
  confirmVariant,
  isLoading = false,
  closeOnBackdrop = true,
  closeOnEsc = true,
  icon,
  children
}) => {
  const confirmBtnRef = useRef(null);

  // Auto focus confirm button when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (confirmBtnRef.current) {
          confirmBtnRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle keyboard events (Escape to close, Enter to confirm)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (closeOnEsc && e.key === 'Escape') {
        e.preventDefault();
        if (!isLoading && onClose) onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, isLoading, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  const resolvedType = type || 'default';
  const resolvedVariant = confirmVariant || (resolvedType === 'default' ? 'info' : resolvedType);
  const displayTitle = title || getDefaultTitle(resolvedType, isAlert);
  const displayConfirmText = confirmText || (isAlert ? 'OK' : resolvedType === 'danger' ? 'Delete' : 'Confirm');
  const displayIcon = icon !== undefined ? icon : getDefaultIcon(resolvedType);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && closeOnBackdrop && !isLoading) {
      if (onClose) onClose();
    }
  };

  const handleConfirmClick = () => {
    if (isLoading) return;
    if (onConfirm) {
      onConfirm();
    } else if (onClose) {
      onClose();
    }
  };

  const handleCancelClick = () => {
    if (isLoading) return;
    if (onClose) onClose();
  };

  // Render text message with paragraphs if multi-line string
  const renderMessageContent = () => {
    if (React.isValidElement(message)) {
      return message;
    }
    if (typeof message === 'string') {
      const parts = message.split('\n').filter((p) => p.trim().length > 0);
      if (parts.length > 1) {
        return parts.map((line, idx) => <p key={idx}>{line}</p>);
      }
      return <p>{message}</p>;
    }
    return message;
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="msp-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="msp-modal-title"
        >
          <motion.div
            className={`msp-modal-container type-${resolvedType}`}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            {!isLoading && (
              <button
                type="button"
                className="msp-modal-close-btn"
                onClick={handleCancelClick}
                aria-label="Close dialog"
              >
                <FiX />
              </button>
            )}

            <div className="msp-modal-content">
              {/* Animated Icon Badge */}
              {displayIcon && (
                <motion.div
                  className="msp-modal-icon-wrap"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.05 }}
                >
                  <div className={`msp-modal-icon-badge type-${resolvedType}`}>
                    {displayIcon}
                  </div>
                </motion.div>
              )}

              {/* Title */}
              {displayTitle && (
                <h3 id="msp-modal-title" className="msp-modal-title">
                  {displayTitle}
                </h3>
              )}

              {/* Message */}
              {message && (
                <div className="msp-modal-message">
                  {renderMessageContent()}
                </div>
              )}

              {/* Extra children if provided */}
              {children}

              {/* Action Buttons */}
              <div className="msp-modal-actions">
                {!isAlert && (
                  <button
                    type="button"
                    className="msp-modal-btn msp-modal-btn-cancel"
                    onClick={handleCancelClick}
                    disabled={isLoading}
                  >
                    {cancelText}
                  </button>
                )}
                <button
                  ref={confirmBtnRef}
                  type="button"
                  className={`msp-modal-btn msp-modal-btn-confirm-${resolvedVariant}`}
                  onClick={handleConfirmClick}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="msp-modal-spinner" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    displayConfirmText
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ConfirmModal;
