/**
 * Utility functions for Android back button handling
 * 
 * This module provides utilities for components to register
 * custom back button handlers in Capacitor Android apps.
 */

/**
 * Check if running in Capacitor environment
 */
export const isCapacitor = () => {
  return typeof window !== 'undefined' && window.Capacitor;
};

/**
 * Get the Capacitor App plugin (if available)
 * Returns null if not in Capacitor or plugin not available
 */
export const getAppPlugin = async () => {
  if (!isCapacitor()) {
    return null;
  }

  try {
    const { App } = await import('@capacitor/app');
    return App;
  } catch (error) {
    console.warn('Capacitor App plugin not available:', error);
    return null;
  }
};

/**
 * Exit the app (only works in Capacitor)
 */
export const exitApp = async () => {
  const App = await getAppPlugin();
  if (App) {
    App.exitApp();
  }
};

