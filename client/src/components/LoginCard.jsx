import { useState, useCallback, memo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEye, FaEyeSlash, FaTimes } from 'react-icons/fa';
import ApiService from '../services/api';
import WelcomeModal from './WelcomeModal';
import './LoginCard.css';

const LoginCard = memo(({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({ university_id: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordData, setForgotPasswordData] = useState({ university_id: '', email: '' });
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeUserName, setWelcomeUserName] = useState('');

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    // Format university_id input (xxxx/xxxxx)
    if (name === 'university_id') {
      // Remove all non-digits
      const digitsOnly = value.replace(/\D/g, '');
      
      // Format as xxxx/xxxxx
      if (digitsOnly.length <= 4) {
        processedValue = digitsOnly;
      } else if (digitsOnly.length <= 9) {
        processedValue = `${digitsOnly.slice(0, 4)}/${digitsOnly.slice(4)}`;
      } else {
        // Limit to 10 digits total (4 + 5)
        processedValue = `${digitsOnly.slice(0, 4)}/${digitsOnly.slice(4, 9)}`;
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const togglePasswordVisibility = useCallback(() => setShowPassword(prev => !prev), []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({});
    
    // Basic validation
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
      onClose();
      if (result.user) {
        const displayName = result.user.full_name || result.user.university_id || 'User';
        setWelcomeUserName(displayName);
        setShowWelcomeModal(true);
      } else {
        setWelcomeUserName('');
        setShowWelcomeModal(true);
      }
    } catch (error) {
      const msg = error.message || '';
      if (msg.includes('Invalid credentials') || msg.includes('Unauthorized')) {
        setErrors({ university_id: 'Invalid university ID or password' });
      } else if (msg.includes('User not found') || msg.includes('not found')) {
        setErrors({ university_id: 'No account found with this university ID' });
      } else if (msg.includes('Invalid university ID format')) {
        setErrors({ university_id: 'Format: xxxx/xxxxx (e.g. 20xx/12345)' });
      } else if (msg.includes('Network') || msg.includes('fetch')) {
        setErrors({ university_id: 'Network error. Please check your connection.' });
      } else {
        setErrors({ university_id: msg || 'Login failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  }, [formData, onClose]);

  const handleForgotPassword = useCallback(() => {
    setShowForgotPassword(true);
    setForgotPasswordError('');
    setForgotPasswordSuccess(false);
  }, []);

  const handleForgotPasswordInputChange = useCallback((e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    // Format university_id input (xxxx/xxxxx)
    if (name === 'university_id') {
      // Remove all non-digits
      const digitsOnly = value.replace(/\D/g, '');
      
      // Format as xxxx/xxxxx
      if (digitsOnly.length <= 4) {
        processedValue = digitsOnly;
      } else if (digitsOnly.length <= 9) {
        processedValue = `${digitsOnly.slice(0, 4)}/${digitsOnly.slice(4)}`;
      } else {
        // Limit to 10 digits total (4 + 5)
        processedValue = `${digitsOnly.slice(0, 4)}/${digitsOnly.slice(4, 9)}`;
      }
    }
    
    setForgotPasswordData(prev => ({ ...prev, [name]: processedValue }));
    if (forgotPasswordError) {
      setForgotPasswordError('');
    }
  }, [forgotPasswordError]);

  const handleForgotPasswordSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    setForgotPasswordError('');
    setForgotPasswordSuccess(false);
    
    // Validation
    if (!forgotPasswordData.university_id && !forgotPasswordData.email) {
      setForgotPasswordError('Please enter either University ID or Email');
      return;
    }
    
    if (forgotPasswordData.university_id && !/^\d{4}\/\d{5}$/.test(forgotPasswordData.university_id)) {
      setForgotPasswordError('Invalid university ID format. Expected format: xxxx/xxxxx (e.g. 20xx/12345)');
      return;
    }
    
    if (forgotPasswordData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotPasswordData.email)) {
      setForgotPasswordError('Invalid email format');
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

  const handleBackToLogin = useCallback(() => {
    setShowForgotPassword(false);
    setForgotPasswordError('');
    setForgotPasswordSuccess(false);
    setForgotPasswordData({ university_id: '', email: '' });
  }, []);

  const handleWelcomeModalClose = useCallback(() => {
    setShowWelcomeModal(false);
    // Redirect to profile after modal closes
    window.location.href = '/profile';
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && createPortal(
        <AnimatePresence>
          <motion.div
            className="login-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              className="login-card"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="login-close-btn" onClick={onClose} aria-label="Close">
                <FaTimes />
              </button>

              <div className="login-header">
                <h2 className="login-title">
                  {showForgotPassword ? 'Reset Password' : 'Welcome Back'}
                </h2>
                <p className="login-subtitle">
                  {showForgotPassword 
                    ? 'Enter your University ID or Email to receive a password reset link'
                    : 'Sign in to your MSP account'}
                </p>
              </div>

              {showForgotPassword ? (
                <form className="login-form" onSubmit={handleForgotPasswordSubmit}>
                  {forgotPasswordSuccess ? (
                    <div className="success-message" style={{ 
                      padding: '20px', 
                      backgroundColor: '#d4edda', 
                      border: '1px solid #c3e6cb', 
                      borderRadius: '5px', 
                      color: '#155724',
                      marginBottom: '20px'
                    }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>✓ Email Sent!</p>
                      <p style={{ margin: '10px 0 0 0' }}>
                        If an account exists with this information, a password reset link has been sent to your email.
                        Please check your inbox and follow the instructions.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="input-group">
                        <label htmlFor="forgot_university_id" className="input-label">
                          University ID (or Email below)
                        </label>
                        <input
                          type="text"
                          id="forgot_university_id"
                          name="university_id"
                          value={forgotPasswordData.university_id}
                          onChange={handleForgotPasswordInputChange}
                          placeholder="20xx/12345"
                          className={`login-input ${forgotPasswordError ? 'error' : ''}`}
                          autoComplete="username"
                        />
                      </div>

                      <div style={{ textAlign: 'center', margin: '15px 0', color: '#666' }}>
                        OR
                      </div>

                      <div className="input-group">
                        <label htmlFor="forgot_email" className="input-label">
                          Email Address
                        </label>
                        <input
                          type="email"
                          id="forgot_email"
                          name="email"
                          value={forgotPasswordData.email}
                          onChange={handleForgotPasswordInputChange}
                          placeholder="your.email@example.com"
                          className={`login-input ${forgotPasswordError ? 'error' : ''}`}
                          autoComplete="email"
                        />
                      </div>

                      {forgotPasswordError && (
                        <div className="error-message" style={{ marginBottom: '15px' }}>
                          {forgotPasswordError}
                        </div>
                      )}

                      <motion.button
                        type="submit"
                        className={`login-submit-btn ${forgotPasswordLoading ? 'loading' : ''}`}
                        disabled={forgotPasswordLoading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {forgotPasswordLoading ? (
                          <div className="loading-spinner">
                            <div className="spinner"></div>
                            Sending...
                          </div>
                        ) : (
                          'Send Reset Link'
                        )}
                      </motion.button>

                      <div style={{ textAlign: 'center', marginTop: '15px' }}>
                        <button
                          type="button"
                          className="forgot-password-btn"
                          onClick={handleBackToLogin}
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          ← Back to Login
                        </button>
                      </div>
                    </>
                  )}
                </form>
              ) : (
                <form className="login-form" onSubmit={handleSubmit}>
                <div className="input-group">
                  <label htmlFor="university_id" className="input-label">University ID</label>
                  <input
                    type="text"
                    id="university_id"
                    name="university_id"
                    value={formData.university_id}
                    onChange={handleInputChange}
                    placeholder="20xx/12345"
                    className={`login-input ${errors.university_id ? 'error' : ''}`}
                    required
                    autoComplete="username"
                  />
                  {errors.university_id && <span className="error-message">{errors.university_id}</span>}
                </div>

                <div className="input-group">
                  <label htmlFor="password" className="input-label">Password</label>
                  <div className="password-container">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                      className={`login-input password-input ${errors.password ? 'error' : ''}`}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={togglePasswordVisibility}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {errors.password && <span className="error-message">{errors.password}</span>}
                </div>

                <div className="login-options">
                  <button type="button" className="forgot-password-btn" onClick={handleForgotPassword}>
                    Forgot Password?
                  </button>
                </div>

                <motion.button
                  type="submit"
                  className={`login-submit-btn ${loading ? 'loading' : ''}`}
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <div className="loading-spinner">
                      <div className="spinner"></div>
                      Signing in...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </motion.button>
              </form>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
      
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={handleWelcomeModalClose}
        userName={welcomeUserName}
      />
    </>
  );
});

LoginCard.displayName = 'LoginCard';

export default LoginCard;
