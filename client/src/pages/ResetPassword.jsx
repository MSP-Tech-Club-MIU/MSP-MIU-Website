import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import mspLogo from '../assets/Images/msp-logo.png';
import './account-activation.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(true);
  const [errors, setErrors] = useState({});
  const [isReset, setIsReset] = useState(false);

  const verifyToken = useCallback(async () => {
    try {
      setVerifyingToken(true);
      // For password reset, we don't need to verify the token separately
      // We'll verify it when submitting the form
      // But we can check if token exists
      if (!token) {
        setErrors({ submit: 'Invalid reset link. Please use the link from your email.' });
      }
    } catch (error) {
      const errorMessage = error.message || 'Invalid or expired reset token.';
      setErrors({ submit: errorMessage });
    } finally {
      setVerifyingToken(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setErrors({ submit: 'Invalid reset link. Please use the link from your email.' });
      setVerifyingToken(false);
    }
  }, [token, verifyToken]);

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (errors.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await ApiService.resetPassword(token, password);
      setIsReset(true);
    } catch (error) {
      const errorMessage = error.message || 'Password reset failed. Please try again.';
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while verifying token
  if (verifyingToken) {
    return (
      <div className="account-activation-container">
        <div className="activation-card">
          <div className="activation-header">
            <img src={mspLogo} alt="MSP Logo" className="activation-logo" />
            <h1 className="activation-title">Verifying Reset Link</h1>
            <p className="activation-subtitle">Please wait while we verify your reset link...</p>
          </div>
          <PageLoader message="Verifying reset link..." />
        </div>
      </div>
    );
  }

  // Show error if no valid token
  if (!token && !verifyingToken) {
    return (
      <div className="account-activation-container">
        <div className="activation-card">
          <div className="activation-header">
            <img src={mspLogo} alt="MSP Logo" className="activation-logo" />
            <h1 className="activation-title">Invalid Reset Link</h1>
            <p className="activation-subtitle">The reset link is invalid or has expired.</p>
          </div>
          {errors.submit && <div className="error-message submit-error">{errors.submit}</div>}
          <button 
            className="success-button"
            onClick={() => navigate('/')}
            style={{ marginTop: '20px' }}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (isReset) {
    return (
      <div className="account-activation-container">
        <div className="activation-success-card">
          <div className="success-logo-container">
            <img src={mspLogo} alt="MSP Logo" className="success-logo" />
          </div>
          <h1 className="success-title">Password Reset Successful!</h1>
          <p className="success-message">
            Your password has been successfully reset. You can now log in with your new password.
          </p>
          <button 
            className="success-button"
            onClick={() => navigate('/login')}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="account-activation-container">
      <BackButton to="/login" label="Back to Login" />
      <div className="activation-card">
        <div className="activation-header">
          <img src={mspLogo} alt="MSP Logo" className="activation-logo" />
          <h1 className="activation-title">Reset Your Password</h1>
          <p className="activation-subtitle">Enter your new password below</p>
        </div>

        <form className="activation-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="password" className="input-label">New Password</label>
            <div className="password-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter your new password"
                className={`login-input password-input ${errors.password ? 'error' : ''}`}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword" className="input-label">Confirm New Password</label>
            <div className="password-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                placeholder="Confirm your new password"
                className={`login-input password-input ${errors.confirmPassword ? 'error' : ''}`}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
          </div>

          {errors.submit && <div className="error-message submit-error">{errors.submit}</div>}

          <button
            type="submit"
            className={`login-submit-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                Resetting Password...
              </div>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;

