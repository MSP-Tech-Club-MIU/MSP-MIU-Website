import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SiteLayout from './layoutpages/SiteLayout';

// Lazy load pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const AboutUs = lazy(() => import('./pages/AboutUs/AboutUs'));
const Board = lazy(() => import('./pages/Board'));
const BecomeMember = lazy(() => import('./pages/BecomeMember'));
const Login = lazy(() => import('./pages/Login'));
const Exercises = lazy(() => import('./pages/Exercises'));
const Events = lazy(() => import('./pages/Events'));
const Suggestions = lazy(() => import('./pages/Suggestions'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Sponsors = lazy(() => import('./pages/Sponsors'));
const FormAdmin = lazy(() => import('./pages/FormAdmin'));
const Profile = lazy(() => import('./pages/Profile'));
const AccountActivation = lazy(() => import('./pages/account-activation'));

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

const AppRouter = () => (
  <Router>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<SiteLayout><Home /></SiteLayout>} />
        <Route path="/about" element={<SiteLayout><AboutUs /></SiteLayout>} />
        <Route path="/Meet-the-board" element={<SiteLayout><Board /></SiteLayout>} />
        <Route path="/become-member" element={<BecomeMember />} />
        <Route path="/login" element={<SiteLayout><Login /></SiteLayout>} />
        <Route path="/exercises" element={<SiteLayout><Exercises /></SiteLayout>} />
        <Route path="/events" element={<SiteLayout><Events /></SiteLayout>} />
        <Route path="/suggestions" element={<SiteLayout><Suggestions /></SiteLayout>} />
        <Route path="/leaderboard" element={<SiteLayout><Leaderboard /></SiteLayout>} />
        <Route path="/sponsors" element={<SiteLayout><Sponsors /></SiteLayout>} />
        <Route path="/registration-admin" element={<SiteLayout><FormAdmin /></SiteLayout>} />
        <Route path="/profile" element={<SiteLayout><Profile /></SiteLayout>} />
        <Route path="/account-activation" element={<AccountActivation />} />
      </Routes>
    </Suspense>
  </Router>
);

export default AppRouter;
