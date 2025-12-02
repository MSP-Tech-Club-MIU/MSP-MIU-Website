import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import SiteLayout from './layoutpages/SiteLayout';
import ScrollToTop from './components/ScrollToTop';
import AndroidBackButtonSetup from './components/AndroidBackButtonSetup';

// Lazy load pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const AboutUs = lazy(() => import('./pages/AboutUs/AboutUs'));
const Board = lazy(() => import('./pages/Board'));
const BecomeMember = lazy(() => import('./pages/BecomeMember'));
const Login = lazy(() => import('./pages/Login'));
const Exercises = lazy(() => import('./pages/Exercises'));
const Events = lazy(() => import('./pages/Events'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const CreateEvent = lazy(() => import('./pages/CreateEvent'));
const Suggestions = lazy(() => import('./pages/Suggestions'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Sponsors = lazy(() => import('./pages/Sponsors'));
const FormAdmin = lazy(() => import('./pages/FormAdmin'));
const Profile = lazy(() => import('./pages/Profile'));
const AccountActivation = lazy(() => import('./pages/account-activation'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AttendanceRequest = lazy(() => import('./pages/AttendanceRequest'));
const AttendanceReview = lazy(() => import('./pages/AttendanceReview'));
const DownloadAndroidApp = lazy(() => import('./pages/DownloadAndroidApp'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Helper to check if running in Capacitor (native app) environment
// Checked synchronously outside render cycle to avoid race conditions
// More robust check: Capacitor must exist AND we must be in a native WebView
const isCapacitorEnv = (() => {
  const hasWindow = typeof window !== 'undefined';
  const hasNavigator = typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string';
  const ua = hasNavigator ? navigator.userAgent : '';
  
  // Check if Capacitor exists
  const windowCapacitor = hasWindow ? !!window.Capacitor : false;
  const windowIonic = hasWindow ? !!window.ionic : false;
  
  // If Capacitor doesn't exist, definitely not in native app
  if (!windowCapacitor) {
    return false;
  }
  
  // Check if we're actually in a native WebView (not just a regular browser)
  // Native apps have specific user agent patterns or are in a WebView
  const isWebView = hasNavigator && (
    /wv|WebView/i.test(ua) || // Android WebView
    (/Mobile.*Safari/i.test(ua) && !/Chrome/i.test(ua)) || // iOS WebView (but not Chrome)
    /capacitor/i.test(ua) || // Explicit Capacitor user agent
    /ionic/i.test(ua) // Explicit Ionic user agent
  );
  
  // Try to get platform from Capacitor (safely)
  let platform = 'unknown';
  let isNativePlatform = false;
  
  try {
    if (windowCapacitor && window.Capacitor?.getPlatform) {
      platform = window.Capacitor.getPlatform();
      // Platform should be 'android', 'ios', etc. - NOT 'web'
      isNativePlatform = platform !== 'web' && platform !== 'unknown';
    }
  } catch (e) {
    // If getPlatform fails, log the error and assume web
    console.warn('[Capacitor Detection] Error getting platform:', e);
    platform = 'web';
    isNativePlatform = false;
  }
  
  // Only consider it Capacitor if we have BOTH:
  // 1. Capacitor exists
  // 2. AND (we're in a WebView OR platform is native)
  const isCapacitor = Boolean(
    windowCapacitor &&
    (isWebView || isNativePlatform)
  );
  
  // Always log the detection result for debugging
  if (hasWindow) {
    console.log('[Capacitor Detection]', {
      hasWindow,
      hasNavigator,
      userAgent: ua.substring(0, 150), // First 150 chars
      windowCapacitor,
      windowIonic,
      isWebView,
      platform,
      isNativePlatform,
      isCapacitorEnv: isCapacitor,
      pathname: window.location.pathname,
      finalDecision: isCapacitor ? 'NATIVE_APP' : 'WEB_BROWSER'
    });
  }
  
  return isCapacitor;
})();

// Component to log when route is matched
const RouteLogger = ({ path }) => {
  useEffect(() => {
    console.log(`[AppRouter] Route matched: ${path}`);
  }, [path]);
  return null;
};

// Wrapper component to conditionally render DownloadAndroidApp only on web
const DownloadAndroidAppWrapper = () => {
  const navigate = useNavigate();

  // Log immediately on render
  console.log('[DownloadAndroidAppWrapper] Component rendered');
  console.log('[DownloadAndroidAppWrapper] isCapacitorEnv:', isCapacitorEnv);
  console.log('[DownloadAndroidAppWrapper] Current pathname:', typeof window !== 'undefined' ? window.location.pathname : 'N/A');

  useEffect(() => {
    // Debug logging
    console.log('[DownloadAndroidAppWrapper] useEffect triggered');
    console.log('[DownloadAndroidAppWrapper] isCapacitorEnv:', isCapacitorEnv);
    console.log('[DownloadAndroidAppWrapper] Current pathname:', window.location.pathname);
    
    // If in Capacitor, redirect to home
    if (isCapacitorEnv) {
      console.log('[DownloadAndroidAppWrapper] Redirecting to home (Capacitor detected)');
      navigate('/', { replace: true });
    } else {
      console.log('[DownloadAndroidAppWrapper] NOT redirecting - Web environment confirmed');
    }
  }, [navigate]); // navigate is stable, effect runs once

  // Render the component only if it's a web environment
  if (isCapacitorEnv) {
    console.log('[DownloadAndroidAppWrapper] Returning redirect fallback');
    // Show a minimal fallback while redirecting
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '40vh',
        color: '#eaf2ff'
      }}>
        <span aria-live="polite">Redirecting…</span>
      </div>
    );
  }

  console.log('[DownloadAndroidAppWrapper] Returning DownloadAndroidApp component');
  try {
    return <DownloadAndroidApp />;
  } catch (error) {
    console.error('[DownloadAndroidAppWrapper] Error rendering DownloadAndroidApp:', error);
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '40vh',
        color: '#ff6b6b'
      }}>
        <span>Error loading page. Check console for details.</span>
      </div>
    );
  }
};

// Enhanced loading component with better UX
const PageLoader = () => (
  <div style={{ 
    display: 'flex', 
    flexDirection: 'column',
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '50vh',
    color: '#eaf2ff',
    gap: '16px'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '3px solid rgba(234, 242, 255, 0.3)',
      borderTop: '3px solid #03A9F4',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
    <p style={{ margin: 0, fontSize: '14px' }}>Loading...</p>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const AppRouter = () => {
  // Log route changes
  React.useEffect(() => {
    const logRoute = () => {
      console.log('[AppRouter] Current route:', window.location.pathname);
    };
    logRoute();
    window.addEventListener('popstate', logRoute);
    return () => window.removeEventListener('popstate', logRoute);
  }, []);

  return (
  <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <ScrollToTop />
      <AndroidBackButtonSetup />
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<SiteLayout><Home /></SiteLayout>} />
        <Route path="/about" element={<SiteLayout><AboutUs /></SiteLayout>} />
        <Route path="/Meet-the-board" element={<SiteLayout><Board /></SiteLayout>} />
        <Route path="/become-member" element={<BecomeMember />} />
        <Route path="/login" element={<SiteLayout><Login /></SiteLayout>} />
        <Route path="/exercises" element={<SiteLayout><Exercises /></SiteLayout>} />
        <Route path="/events" element={<SiteLayout><Events /></SiteLayout>} />
        <Route path="/events/create" element={<SiteLayout><CreateEvent /></SiteLayout>} />
        <Route path="/events/:id" element={<SiteLayout><EventDetails /></SiteLayout>} />
        <Route path="/suggestions" element={<SiteLayout><Suggestions /></SiteLayout>} />
        <Route path="/leaderboard" element={<SiteLayout><Leaderboard /></SiteLayout>} />
        <Route path="/sponsors" element={<SiteLayout><Sponsors /></SiteLayout>} />
        <Route path="/registration-admin" element={<SiteLayout><FormAdmin /></SiteLayout>} />
        <Route path="/profile" element={<SiteLayout><Profile /></SiteLayout>} />
        <Route path="/account-activation" element={<AccountActivation />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/attendance-request" element={<SiteLayout><AttendanceRequest /></SiteLayout>} />
        <Route path="/attendance-review" element={<SiteLayout><AttendanceReview /></SiteLayout>} />
        <Route 
          path="/download-android" 
          element={
            <SiteLayout>
              <RouteLogger path="/download-android" />
              <DownloadAndroidAppWrapper />
            </SiteLayout>
          } 
        />
        <Route path="*" element={<SiteLayout><NotFound /></SiteLayout>} />
      </Routes>
    </Suspense>
  </Router>
);
};

export default AppRouter;
