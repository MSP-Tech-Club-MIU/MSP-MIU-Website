import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
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
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetails = lazy(() => import('./pages/CourseDetails'));
const Competitions = lazy(() => import('./pages/Competitions'));
const CompetitionDetails = lazy(() => import('./pages/CompetitionDetails'));
const CompetitionTimeslotPage = lazy(() => import('./pages/CompetitionTimeslotPage'));
const CreateTeam = lazy(() => import('./pages/CreateTeam'));
const CompetitionWorkspace = lazy(() => import('./pages/CompetitionWorkspace'));
const TaskQuizMarks = lazy(() => import('./pages/TaskQuizMarks'));
const JudgeSubmissions = lazy(() => import('./pages/JudgeSubmissions'));
const QuizPage = lazy(() => import('./pages/QuizPage'));
const QuizTakeSession = lazy(() => import('./pages/QuizTakeSession'));
const AcceptTeamInvitation = lazy(() => import('./pages/AcceptTeamInvitation'));
const Suggestions = lazy(() => import('./pages/Suggestions'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Sponsors = lazy(() => import('./pages/Sponsors'));
const Profile = lazy(() => import('./pages/Profile'));
const AccountActivation = lazy(() => import('./pages/account-activation'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AttendanceRequest = lazy(() => import('./pages/AttendanceRequest'));
const AttendanceReview = lazy(() => import('./pages/AttendanceReview'));
const DownloadAndroidApp = lazy(() => import('./pages/DownloadAndroidApp'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AdminPanel = lazy(() => import('./pages/Admin/AdminPanel'));
const CompetitionManagement = lazy(() => import('./pages/Admin/CompetitionManagement'));

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
    if (window.Capacitor?.getPlatform) {
      platform = window.Capacitor.getPlatform();
      // Platform should be 'android', 'ios', etc. - NOT 'web'
      isNativePlatform = platform !== 'web' && platform !== 'unknown';
    }
  } catch (e) {
    // If getPlatform fails, assume web
    platform = 'web';
    isNativePlatform = false;
  }

  // Only consider it Capacitor if we have BOTH:
  // 1. Capacitor exists (already verified above)
  // 2. AND (we're in a WebView OR platform is native)
  // Note: windowIonic is logged for debugging but not used in detection
  // as Ionic can be present in regular web apps without indicating native context.
  const isCapacitor = Boolean(
    windowCapacitor &&
    (isWebView || isNativePlatform)
  );

  return isCapacitor;
})();

// Wrapper component to conditionally render DownloadAndroidApp only on web
const DownloadAndroidAppWrapper = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // If in Capacitor, redirect to home
    if (isCapacitorEnv) {
      navigate('/', { replace: true });
    }
  }, [navigate]); // navigate is stable, effect runs once

  // Render the component only if it's a web environment
  if (isCapacitorEnv) {
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

  return <DownloadAndroidApp />;
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
          <Route path="/events/create" element={<Navigate to="/admin/events" replace />} />
          <Route path="/events/:id" element={<SiteLayout><EventDetails /></SiteLayout>} />
          <Route path="/courses" element={<SiteLayout><Courses /></SiteLayout>} />
          <Route path="/courses/:id" element={<SiteLayout><CourseDetails /></SiteLayout>} />
          <Route path="/competitions" element={<SiteLayout><Competitions /></SiteLayout>} />
          <Route path="/competitions/:id" element={<SiteLayout><CompetitionDetails /></SiteLayout>} />
          <Route path="/competitions/:id/timeslots" element={<SiteLayout><CompetitionTimeslotPage /></SiteLayout>} />
          <Route path="/competitions/:id/create-team" element={<SiteLayout><CreateTeam /></SiteLayout>} />
          <Route path="/competitions/:id/team/:teamId" element={<SiteLayout><CompetitionWorkspace /></SiteLayout>} />
          <Route path="/competitions/:id/team/:teamId/marks" element={<SiteLayout><TaskQuizMarks /></SiteLayout>} />
          <Route path="/competitions/:id/judging" element={<SiteLayout><JudgeSubmissions /></SiteLayout>} />
          <Route path="/quizpage" element={<SiteLayout><QuizPage /></SiteLayout>} />
          <Route path="/quizpage/:quizId" element={<SiteLayout><QuizPage /></SiteLayout>} />
          <Route path="/quizpage/:quizId/take/:step" element={<SiteLayout><QuizTakeSession /></SiteLayout>} />
          <Route path="/accept-team-invitation" element={<AcceptTeamInvitation />} />
          <Route path="/suggestions" element={<SiteLayout><Suggestions /></SiteLayout>} />
          <Route path="/leaderboard" element={<SiteLayout><Leaderboard /></SiteLayout>} />
          <Route path="/sponsors" element={<SiteLayout><Sponsors /></SiteLayout>} />
          <Route path="/registration-admin" element={<Navigate to="/admin/registrations" replace />} />
          <Route path="/profile" element={<SiteLayout><Profile /></SiteLayout>} />
          <Route path="/account-activation" element={<AccountActivation />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/attendance-request" element={<SiteLayout><AttendanceRequest /></SiteLayout>} />
          <Route path="/attendance-review" element={<SiteLayout><AttendanceReview /></SiteLayout>} />
          <Route path="/download-android" element={<SiteLayout><DownloadAndroidAppWrapper /></SiteLayout>} />
          <Route path="/admin/competition-management" element={<SiteLayout><CompetitionManagement /></SiteLayout>} />
          <Route path="/admin/competition-management/:competitionId" element={<SiteLayout><CompetitionManagement /></SiteLayout>} />
          <Route path="/admin/*" element={<SiteLayout><AdminPanel /></SiteLayout>} />
          <Route path="*" element={<SiteLayout><NotFound /></SiteLayout>} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default AppRouter;
