import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAndroidBackButton } from '../hooks/useAndroidBackButton';

/**
 * Component to handle Android back button globally
 * Should be placed in the root of the app
 */
const AndroidBackButtonHandler = ({ 
  onCloseModal,
  onCloseDrawer,
  isModalOpen = false,
  isDrawerOpen = false
}) => {
  const location = useLocation();
  const { registerHandler } = useAndroidBackButton({
    exitOnHome: true,
    homePath: '/'
  });

  useEffect(() => {
    // Register handler for closing modals/drawers
    const unregister = registerHandler(async () => {
      // Priority: Close drawer first, then modal
      if (isDrawerOpen && onCloseDrawer) {
        onCloseDrawer();
        return false; // Prevent default navigation
      }
      
      if (isModalOpen && onCloseModal) {
        onCloseModal();
        return false; // Prevent default navigation
      }

      // Allow default behavior (navigation)
      return true;
    }, 100); // High priority

    return unregister;
  }, [registerHandler, isModalOpen, isDrawerOpen, onCloseModal, onCloseDrawer]);

  return null; // This component doesn't render anything
};

export default AndroidBackButtonHandler;

