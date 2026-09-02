import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import ConfirmModal from '../components/common/ConfirmModal';

const ModalContext = createContext(null);

// Global handler holder for non-hook usage
let globalModalHandler = null;

/**
 * Intelligent helper to infer modal type from message text if not explicitly provided
 */
const inferType = (text, defaultType = 'info') => {
  if (typeof text !== 'string') return defaultType;
  const lower = text.toLowerCase();
  if (
    lower.includes('delete') ||
    lower.includes('remove') ||
    lower.includes('clear') ||
    lower.includes('cancel') ||
    lower.includes('unblock') ||
    lower.includes('fail') ||
    lower.includes('error')
  ) {
    return 'danger';
  }
  if (
    lower.includes('warning') ||
    lower.includes('resend') ||
    lower.includes('reset') ||
    lower.includes('overwrite') ||
    lower.includes('send')
  ) {
    return 'warning';
  }
  if (
    lower.includes('success') ||
    lower.includes('done') ||
    lower.includes('congrat') ||
    lower.includes('saved') ||
    lower.includes('updated') ||
    lower.includes('created')
  ) {
    return 'success';
  }
  return defaultType;
};

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'default',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isAlert: false,
    confirmVariant: null,
    isLoading: false,
    closeOnBackdrop: true,
    closeOnEsc: true,
    icon: undefined
  });

  const resolverRef = useRef(null);

  /**
   * Closes the active modal and resolves promise with result
   */
  const handleClose = useCallback((result = false) => {
    setModalState((prev) => ({ ...prev, isOpen: false, isLoading: false }));
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  /**
   * Handles modal confirmation (supports async onConfirm handlers)
   */
  const handleConfirm = useCallback(async () => {
    const currentAction = modalState.onConfirmAction;
    if (typeof currentAction === 'function') {
      try {
        setModalState((prev) => ({ ...prev, isLoading: true }));
        const result = await currentAction();
        handleClose(result !== false);
      } catch (err) {
        setModalState((prev) => ({ ...prev, isLoading: false }));
        // Log or preserve modal open on error
        console.error('Modal action error:', err);
      }
    } else {
      handleClose(true);
    }
  }, [handleClose, modalState.onConfirmAction]);

  /**
   * Show a Confirmation Modal returning a Promise<boolean>
   * @param {string|Object} options
   */
  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;

      let normalized = {};
      if (typeof options === 'string') {
        normalized = {
          message: options,
          type: inferType(options, 'info'),
          confirmText: options.toLowerCase().includes('delete')
            ? 'Delete'
            : options.toLowerCase().includes('clear')
            ? 'Clear'
            : options.toLowerCase().includes('cancel')
            ? 'Yes, Cancel'
            : 'Confirm'
        };
      } else if (typeof options === 'object' && options !== null) {
        normalized = { ...options };
        if (!normalized.type && typeof normalized.message === 'string') {
          normalized.type = inferType(normalized.message, 'info');
        }
      }

      setModalState({
        isOpen: true,
        title: normalized.title || (normalized.type === 'danger' ? 'Confirm Action' : 'Are you sure?'),
        message: normalized.message || '',
        type: normalized.type || 'info',
        confirmText: normalized.confirmText || (normalized.type === 'danger' ? 'Delete' : 'Confirm'),
        cancelText: normalized.cancelText || 'Cancel',
        isAlert: false,
        confirmVariant: normalized.confirmVariant || normalized.type || 'info',
        isLoading: false,
        closeOnBackdrop: normalized.closeOnBackdrop !== false,
        closeOnEsc: normalized.closeOnEsc !== false,
        icon: normalized.icon,
        onConfirmAction: normalized.onConfirm
      });
    });
  }, []);

  /**
   * Show an Alert Modal returning a Promise<void>
   * @param {string|Object} options
   */
  const alert = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = () => resolve();

      let normalized = {};
      if (typeof options === 'string') {
        normalized = {
          message: options,
          type: inferType(options, 'info'),
          confirmText: 'OK'
        };
      } else if (typeof options === 'object' && options !== null) {
        normalized = { ...options };
        if (!normalized.type && typeof normalized.message === 'string') {
          normalized.type = inferType(normalized.message, 'info');
        }
      }

      setModalState({
        isOpen: true,
        title: normalized.title || (normalized.type === 'danger' ? 'Notice' : normalized.type === 'success' ? 'Success' : 'Information'),
        message: normalized.message || '',
        type: normalized.type || 'info',
        confirmText: normalized.confirmText || normalized.buttonText || 'OK',
        cancelText: '',
        isAlert: true,
        confirmVariant: normalized.confirmVariant || normalized.type || 'info',
        isLoading: false,
        closeOnBackdrop: normalized.closeOnBackdrop !== false,
        closeOnEsc: normalized.closeOnEsc !== false,
        icon: normalized.icon,
        onConfirmAction: normalized.onConfirm
      });
    });
  }, []);

  // Expose global handlers
  globalModalHandler = { confirm, alert };

  return (
    <ModalContext.Provider value={{ confirm, alert }}>
      {children}
      <ConfirmModal
        isOpen={modalState.isOpen}
        onClose={() => handleClose(false)}
        onConfirm={handleConfirm}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        isAlert={modalState.isAlert}
        confirmVariant={modalState.confirmVariant}
        isLoading={modalState.isLoading}
        closeOnBackdrop={modalState.closeOnBackdrop}
        closeOnEsc={modalState.closeOnEsc}
        icon={modalState.icon}
      />
    </ModalContext.Provider>
  );
};

/**
 * Hook to access the modal system inside React components
 */
export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const useConfirm = () => {
  const { confirm } = useModal();
  return confirm;
};

export const useAlert = () => {
  const { alert } = useModal();
  return alert;
};

/**
 * Global imperative helper functions that work everywhere
 */
export const confirmModal = (options) => {
  if (globalModalHandler) {
    return globalModalHandler.confirm(options);
  }
  // Fallback to native confirm if provider is somehow not mounted
  if (typeof window !== 'undefined') {
    const msg = typeof options === 'string' ? options : options?.message || '';
    return Promise.resolve(window.confirm(msg));
  }
  return Promise.resolve(false);
};

export const alertModal = (options) => {
  if (globalModalHandler) {
    return globalModalHandler.alert(options);
  }
  // Fallback to native alert if provider is somehow not mounted
  if (typeof window !== 'undefined') {
    const msg = typeof options === 'string' ? options : options?.message || '';
    window.alert(msg);
  }
  return Promise.resolve();
};

export default ModalContext;
