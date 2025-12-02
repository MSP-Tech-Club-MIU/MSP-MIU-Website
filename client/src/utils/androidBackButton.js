/**
 * Utility functions for Android back button handling
 * 
 * This module provides utilities for components to register
 * custom back button handlers in Capacitor Android apps.
 */

/**
 * Check if running in Capacitor (native app) environment
 * More robust check: Capacitor must exist AND we must be in a native WebView
 */
export const isCapacitor = () => {
  const hasWindow = typeof window !== 'undefined';
  const hasNavigator = typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string';
  const ua = hasNavigator ? navigator.userAgent : '';
  
  // Check if Capacitor exists
  const windowCapacitor = hasWindow ? !!window.Capacitor : false;
  
  // If Capacitor doesn't exist, definitely not in native app
  if (!windowCapacitor) {
    return false;
  }
  
  // Check if we're actually in a native WebView (not just a regular browser)
  const isWebView = hasNavigator && (
    /wv|WebView/i.test(ua) || // Android WebView
    (/Mobile.*Safari/i.test(ua) && !/Chrome/i.test(ua)) || // iOS WebView (but not Chrome)
    /capacitor/i.test(ua) || // Explicit Capacitor user agent
    /ionic/i.test(ua) // Explicit Ionic user agent
  );
  
  // Try to get platform from Capacitor (safely)
  let isNativePlatform = false;
  
  try {
    if (windowCapacitor && window.Capacitor?.getPlatform) {
      const platform = window.Capacitor.getPlatform();
      // Platform should be 'android', 'ios', etc. - NOT 'web'
      isNativePlatform = platform !== 'web' && platform !== 'unknown';
    }
  } catch (e) {
    // If getPlatform fails, assume web
    isNativePlatform = false;
  }
  
  // Only consider it Capacitor if we have BOTH:
  // 1. Capacitor exists
  // 2. AND (we're in a WebView OR platform is native)
  return Boolean(
    windowCapacitor &&
    (isWebView || isNativePlatform)
  );
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
 * Check if running on Android platform specifically
 * Returns true only if running in Android Capacitor app
 */
export const isAndroid = () => {
  if (!isCapacitor()) {
    return false;
  }
  
  try {
    const hasWindow = typeof window !== 'undefined';
    if (hasWindow && window.Capacitor?.getPlatform) {
      const platform = window.Capacitor.getPlatform();
      return platform === 'android';
    }
  } catch (e) {
    // If getPlatform fails, check user agent as fallback
    const hasNavigator = typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string';
    if (hasNavigator) {
      const ua = navigator.userAgent;
      return /wv|WebView/i.test(ua) && /Android/i.test(ua);
    }
  }
  
  return false;
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

