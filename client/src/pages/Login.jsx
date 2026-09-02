import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaEye,
  FaEyeSlash,
  FaUserPlus,
  FaCalendarAlt,
  FaInfoCircle,
  FaShieldAlt,
  FaArrowRight,
  FaCheckCircle,
  FaSignOutAlt,
  FaUser
} from 'react-icons/fa';
import { MdMenuBook, MdVerified } from 'react-icons/md';
import ApiService from '../services/api';
import SEO from '../components/SEO';
import WelcomeModal from '../components/WelcomeModal';
import BackButton from '../components/BackButton';
import mspLogo from '../assets/Images/msp-logo.png';
import './Login.css';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect destination after successful login
  const fromPath = location.state?.from?.pathname;
  const postLoginRedirect =
    typeof fromPath === 'string' && fromPath.startsWith('/') && !fromPath.startsWith('//')
      ? fromPath
      : undefined;

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Form states
  const [formData, setFormData] = useState({ university_id: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordData, setForgotPasswordData] = useState({ university_id: '', email: '' });
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);

  // Welcome modal states
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeUserName, setWelcomeUserName] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);

  // Check auth state on mount
  useEffect(() => {
    const checkCurrentAuth = async () => {
      try {
        if (ApiService.isAuthenticated()) {
          setIsAuthenticated(true);
          const profile = await ApiService.getProfile();
          setCurrentUser(profile);
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } catch {
        setIsAuthenticated(false);
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    };
    checkCurrentAuth();
  }, []);

  // Format university ID (xxxx/xxxxx)
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === 'university_id') {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length <= 4) {
        processedValue = digitsOnly;
      } else if (digitsOnly.length <= 9) {
        processedValue = `${digitsOnly.slice(0, 4)}/${digitsOnly.slice(4)}`;
      } else {
        processedValue = `${digitsOnly.slice(0, 4)}/${digitsOnly.slice(4, 9)}`;
      }
    }

    setFormData((prev) => ({ ...prev, [name]: processedValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setErrors({});

    const newErrors = {};
    if (!formData.university_id) {
      newErrors.university_id = 'University ID is required';
    } else if (!/^\d{4}\/\d{5}$/.test(formData.university_id)) {
      newErrors.university_id = 'Format: xxxx/xxxxx (e.g. 20xx/12345)';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const result = await ApiService.login(formData.university_id, formData.password);
      setFormData({ university_id: '', password: '' });
      setErrors({});

      if (result.user) {
        setLoggedInUser(result.user);
        const displayName = result.user.full_name || result.user.university_id || 'User';
        setWelcomeUserName(displayName);
        setShowWelcomeModal(true);
      } else {
        setLoggedInUser(null);
        setWelcomeUserName('');
        setShowWelcomeModal(true);
      }
    } catch (error) {
      const msg = error.message || '';
      if (msg.includes('Invalid credentials') || msg.includes('Unauthorized')) {
        setErrors({ submit: 'Invalid University ID or password. Please verify and try again.' });
      } else if (msg.includes('User not found') || msg.includes('not found')) {
        setErrors({ submit: 'No member account found with this University ID.' });
      } else if (msg.includes('Invalid university ID format')) {
        setErrors({ university_id: 'Format: xxxx/xxxxx (e.g. 20xx/12345)' });
      } else if (msg.includes('Network') || msg.includes('fetch')) {
        setErrors({ submit: 'Network error. Please check your internet connection.' });
      } else {
        setErrors({ submit: msg || 'Sign in failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  }, [formData]);

  const handleForgotPasswordInputChange = useCallback((e) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === 'university_id') {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length <= 4) {
        processedValue = digitsOnly;
      } else if (digitsOnly.length <= 9) {
        processedValue = `${digitsOnly.slice(0, 4)}/${digitsOnly.slice(4)}`;
      } else {
        processedValue = `${digitsOnly.slice(0, 4)}/${digitsOnly.slice(4, 9)}`;
      }
    }

    setForgotPasswordData((prev) => ({ ...prev, [name]: processedValue }));
    if (forgotPasswordError) {
      setForgotPasswordError('');
    }
  }, [forgotPasswordError]);

  const handleForgotPasswordSubmit = useCallback(async (e) => {
    e.preventDefault();
    setForgotPasswordError('');
    setForgotPasswordSuccess(false);

    if (!forgotPasswordData.university_id && !forgotPasswordData.email) {
      setForgotPasswordError('Please enter either your University ID or Email address.');
      return;
    }

    if (forgotPasswordData.university_id && !/^\d{4}\/\d{5}$/.test(forgotPasswordData.university_id)) {
      setForgotPasswordError('Invalid University ID format. Expected format: xxxx/xxxxx (e.g. 20xx/12345)');
      return;
    }

    if (forgotPasswordData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotPasswordData.email)) {
      setForgotPasswordError('Please enter a valid email address.');
      return;
    }

    setForgotPasswordLoading(true);

    try {
      await ApiService.forgotPassword(
        forgotPasswordData.university_id || null,
        forgotPasswordData.email || null
      );
      setForgotPasswordSuccess(true);
      setForgotPasswordData({ university_id: '', email: '' });
    } catch (error) {
      setForgotPasswordError(error.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setForgotPasswordLoading(false);
    }
  }, [forgotPasswordData]);

  const handleWelcomeModalClose = useCallback(async () => {
    setShowWelcomeModal(false);

    if (
      postLoginRedirect &&
      typeof postLoginRedirect === 'string' &&
      postLoginRedirect.startsWith('/') &&
      !postLoginRedirect.startsWith('//')
    ) {
      window.location.href = postLoginRedirect;
      return;
    }

    try {
      const adminAccess = await ApiService.checkAdminAccess();
      if (adminAccess.success) {
        window.location.href = '/admin';
        return;
      }
    } catch {
      // Fall through to role/department check
    }

    const deptRaw = loggedInUser?.department_id;
    const deptId = typeof deptRaw === 'number' ? deptRaw : parseInt(deptRaw, 10);
    const hasRegistrationsAccess =
      loggedInUser?.role === 'board' || (!Number.isNaN(deptId) && deptId === 5);

    window.location.href = hasRegistrationsAccess ? '/admin' : '/profile';
  }, [postLoginRedirect, loggedInUser]);

  const handleLogout = useCallback(() => {
    ApiService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
  }, []);

  const structuredData = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Login - MSP Tech Club MIU',
    description: 'Sign in to your official MSP Tech Club member account or learn about guest access.',
    url: 'https://msp-miu.tech/login'
  }), []);

  return (
    <div className="login-page-container">
      <SEO
        title="Member Login"
        description="Sign in to your MSP Tech Club member account. Guests can explore all courses and event resources freely without an account."
        url="/login"
        noindex
        structuredData={structuredData}
      />

      <BackButton to="/" label="Back to Home" />

      <div className="login-page-grid">
        {/* =========================================
            LEFT COLUMN: Information & Guest Disclaimer
            ========================================= */}
        <div className="login-info-column">
          <div className="login-hero-header">
            <div className="login-badge">
              <FaShieldAlt aria-hidden="true" />
              <span>Portal &amp; Access Guide</span>
            </div>
            <h1 className="login-hero-title">
              MSP Tech Club <span className="gradient-text">Member Portal</span>
            </h1>
            <p className="login-hero-description">
              Sign in to manage your MSP member activities, submissions, and tasks.
            </p>
          </div>

          {/* Guest Access Disclaimer Card */}
          <div className="login-info-card login-info-card--guest">
            <div className="login-card-header">
              <div className="login-card-icon login-card-icon--cyan">
                <FaInfoCircle />
              </div>
              <h2 className="login-card-title">Guest &amp; Student Access</h2>
            </div>
            <p className="login-card-text">
              <strong>No account needed to learn!</strong> All guests and university students can freely
              browse our educational catalog, watch complete course tutorials, stream sessions, and
              download public event content and materials at any time.
            </p>
            <ul className="login-card-features">
              <li className="login-card-feature-item">
                <span className="login-feature-bullet">✓</span>
                <span>Unlimited free access to all technical and non-technical courses</span>
              </li>
              <li className="login-card-feature-item">
                <span className="login-feature-bullet">✓</span>
                <span>Direct download of event slides, resources, and handouts</span>
              </li>
              <li className="login-card-feature-item">
                <span className="login-feature-bullet">✓</span>
                <span>Open participation in public workshops and hackathons</span>
              </li>
            </ul>
            <div className="login-card-actions">
              <Link to="/courses" className="login-action-btn login-action-btn--secondary">
                <MdMenuBook />
                <span>Browse Courses</span>
              </Link>
              <Link to="/events" className="login-action-btn login-action-btn--secondary">
                <FaCalendarAlt />
                <span>Explore Events</span>
              </Link>
            </div>
          </div>

          {/* Member Accounts & Recruitment Card */}
          <div className="login-info-card login-info-card--member">
            <div className="login-card-header">
              <div className="login-card-icon login-card-icon--indigo">
                <MdVerified />
              </div>
              <h2 className="login-card-title">Member Accounts &amp; Recruitment</h2>
            </div>
            <p className="login-card-text">
              <strong>Accounts are exclusively for official MSP members and board organizers.</strong>
              {' '}Member credentials are automatically provisioned when you join an MSP committee or department.
            </p>
            <p className="login-card-text" style={{ marginBottom: '16px' }}>
              Want to join our team? You can apply for club membership via our official
              {' '}<strong>Become a Member</strong> application form whenever seasonal recruitment is active!
            </p>
            <div className="login-card-actions">
              <Link to="/become-member" className="login-action-btn login-action-btn--primary">
                <FaUserPlus />
                <span>Become a Member</span>
                <FaArrowRight style={{ fontSize: '11px' }} />
              </Link>
            </div>
          </div>
        </div>

        {/* =========================================
            RIGHT COLUMN: Sign-in / Reset Form Card
            ========================================= */}
        <div className="login-form-column">
          <div className="login-main-card">
            <div className="login-form-header">
              <img src={mspLogo} alt="MSP Logo" className="login-brand-logo" />
              <h2 className="login-form-title">
                {showForgotPassword ? 'Reset Password' : 'Member Sign In'}
              </h2>
              <p className="login-form-subtitle">
                {showForgotPassword
                  ? 'Enter your University ID or registered Email to receive a password reset link'
                  : 'Enter your credentials to access your MSP member dashboard'}
              </p>
            </div>

            {/* If user is already authenticated */}
            {!authChecking && isAuthenticated ? (
              <div className="login-authenticated-box">
                <div className="login-authenticated-avatar">
                  {currentUser?.profile_picture_url ? (
                    <img src={currentUser.profile_picture_url} alt="Profile" />
                  ) : (
                    <FaUser />
                  )}
                </div>
                <h3 className="login-authenticated-title">
                  Welcome, {currentUser?.full_name || currentUser?.university_id || 'Member'}!
                </h3>
                <p className="login-authenticated-subtitle">
                  You are already signed in to your MSP account.
                </p>

                <div className="login-authenticated-actions">
                  <button
                    type="button"
                    className="login-submit-btn"
                    onClick={() => navigate('/profile')}
                  >
                    Go to Profile
                  </button>
                  <button
                    type="button"
                    className="login-action-btn login-action-btn--secondary"
                    onClick={handleLogout}
                    style={{ justifyContent: 'center' }}
                  >
                    <FaSignOutAlt />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : showForgotPassword ? (
              /* Forgot Password Form */
              <form className="login-page-form" onSubmit={handleForgotPasswordSubmit}>
                {forgotPasswordSuccess ? (
                  <div className="login-alert-banner login-alert-banner--success">
                    <FaCheckCircle style={{ fontSize: '18px', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong>Email Sent!</strong>
                      <p style={{ margin: '4px 0 0' }}>
                        A password reset link has been sent to your registered email address.
                        Please check your inbox and spam folder.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {forgotPasswordError && (
                      <div className="login-alert-banner login-alert-banner--error">
                        <div>{forgotPasswordError}</div>
                      </div>
                    )}

                    <div className="login-field-group">
                      <label htmlFor="forgot_university_id" className="login-field-label">
                        University ID
                      </label>
                      <input
                        type="text"
                        id="forgot_university_id"
                        name="university_id"
                        value={forgotPasswordData.university_id}
                        onChange={handleForgotPasswordInputChange}
                        placeholder="20xx/12345"
                        className="login-field-input"
                        autoComplete="username"
                      />
                    </div>

                    <div className="login-divider">
                      <span>OR</span>
                    </div>

                    <div className="login-field-group">
                      <label htmlFor="forgot_email" className="login-field-label">
                        Registered Email Address
                      </label>
                      <input
                        type="email"
                        id="forgot_email"
                        name="email"
                        value={forgotPasswordData.email}
                        onChange={handleForgotPasswordInputChange}
                        placeholder="yourname@example.com"
                        className="login-field-input"
                        autoComplete="email"
                      />
                    </div>

                    <motion.button
                      type="submit"
                      className="login-submit-btn"
                      disabled={forgotPasswordLoading}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      {forgotPasswordLoading ? (
                        <div className="loading-spinner">
                          <div className="spinner"></div>
                          <span>Sending Link...</span>
                        </div>
                      ) : (
                        'Send Reset Link'
                      )}
                    </motion.button>
                  </>
                )}

                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="login-text-btn"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordError('');
                      setForgotPasswordSuccess(false);
                    }}
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              /* Sign In Form */
              <form className="login-page-form" onSubmit={handleSubmit}>
                {errors.submit && (
                  <div className="login-alert-banner login-alert-banner--error">
                    <div>{errors.submit}</div>
                  </div>
                )}

                <div className="login-field-group">
                  <label htmlFor="university_id" className="login-field-label">
                    University ID
                  </label>
                  <input
                    type="text"
                    id="university_id"
                    name="university_id"
                    value={formData.university_id}
                    onChange={handleInputChange}
                    placeholder="20xx/12345"
                    className={`login-field-input ${errors.university_id ? 'error' : ''}`}
                    required
                    autoComplete="username"
                  />
                  {errors.university_id && (
                    <span className="login-field-error">{errors.university_id}</span>
                  )}
                </div>

                <div className="login-field-group">
                  <label htmlFor="password" className="login-field-label">
                    Password
                  </label>
                  <div className="login-password-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                      className={`login-field-input login-password-input ${errors.password ? 'error' : ''}`}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="login-password-toggle"
                      onClick={togglePasswordVisibility}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {errors.password && (
                    <span className="login-field-error">{errors.password}</span>
                  )}
                </div>

                <div className="login-form-options">
                  <button
                    type="button"
                    className="login-text-btn"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setForgotPasswordError('');
                      setForgotPasswordSuccess(false);
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>

                <motion.button
                  type="submit"
                  className="login-submit-btn"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {loading ? (
                    <div className="loading-spinner">
                      <div className="spinner"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </motion.button>
              </form>
            )}
          </div>
        </div>
      </div>

      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={handleWelcomeModalClose}
        userName={welcomeUserName}
      />
    </div>
  );
};

export default Login;