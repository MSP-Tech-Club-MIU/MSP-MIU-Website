import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Hook to handle Android back button in Capacitor apps
 * Handles navigation, closing modals/drawers, and app exit
 * 
 * Requires @capacitor/app plugin to be installed:
 * npm install @capacitor/app
 * npx cap sync
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.onBackPress - Custom handler function (return false to prevent default)
 * @param {boolean} options.canGoBack - Whether to allow navigation back (default: true)
 * @param {boolean} options.exitOnHome - Whether to exit app when on home page (default: true)
 * @param {string} options.homePath - Path considered as home (default: '/')
 * @returns {Object} Object with registerHandler function for components to register custom handlers
 */
export const useAndroidBackButton = (options = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    onBackPress,
    canGoBack = true,
    exitOnHome = true,
    homePath = '/'
  } = options;

  const handlersRef = useRef([]);
  const isHandlingRef = useRef(false);

  // Register a handler that will be called when back button is pressed
  const registerHandler = (handler, priority = 0) => {
    const id = Date.now() + Math.random();
    handlersRef.current.push({ id, handler, priority });
    handlersRef.current.sort((a, b) => b.priority - a.priority);
    
    return () => {
      handlersRef.current = handlersRef.current.filter(h => h.id !== id);
    };
  };

  useEffect(() => {
    // Check if running in Capacitor
    const isCapacitor = typeof window !== 'undefined' && window.Capacitor;
    
    if (!isCapacitor) {
      return; // Not in native app, skip
    }

    let listenerPromise = null;
    let isMounted = true;

    // Dynamically import Capacitor App plugin
    import('@capacitor/app')
      .then(({ App: AppPlugin }) => {
        if (!isMounted) return;

        const handleBackButton = async () => {
          // Prevent multiple simultaneous handlers
          if (isHandlingRef.current) {
            return;
          }

          isHandlingRef.current = true;

          try {
            // First, check if custom handler is provided
            if (onBackPress) {
              const result = await onBackPress();
              if (result === false) {
                // Handler prevented default behavior
                isHandlingRef.current = false;
                return;
              }
            }

            // Execute registered handlers in priority order
            for (const { handler } of handlersRef.current) {
              try {
                const result = await handler();
                if (result === false) {
                  // Handler prevented default behavior
                  isHandlingRef.current = false;
                  return;
                }
              } catch (error) {
                console.error('Error in back button handler:', error);
              }
            }

            // Default behavior: navigate back or exit app
            if (canGoBack) {
              if (location.pathname === homePath && exitOnHome) {
                // On home page, exit the app
                AppPlugin.exitApp();
              } else {
                // Navigate back in history
                navigate(-1);
              }
            }
          } catch (error) {
            console.error('Error handling back button:', error);
          } finally {
            // Reset handling flag after a short delay
            setTimeout(() => {
              isHandlingRef.current = false;
            }, 100);
          }
        };

        // Register the back button listener
        listenerPromise = AppPlugin.addListener('backButton', handleBackButton);
      })
      .catch((error) => {
        console.warn('Capacitor App plugin not available:', error);
      });

    // Cleanup function
    return () => {
      isMounted = false;
      handlersRef.current = [];
      if (listenerPromise) {
        listenerPromise.then(listener => listener.remove()).catch(console.error);
      }
    };
  }, [navigate, location.pathname, onBackPress, canGoBack, exitOnHome, homePath]);

  return { registerHandler };
};

export default useAndroidBackButton;

