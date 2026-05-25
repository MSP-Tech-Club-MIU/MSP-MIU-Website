import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import mspLogo from '../assets/Images/msp-logo.png';
import './account-activation.css';

const AccountActivation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || ''; // Legacy support
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isActivated, setIsActivated] = useState(false);

  const verifyToken = useCallback(async () => {
    try {
      setVerifyingToken(true);
      const result = await ApiService.verifyActivationToken(token);
      if (result.email) {
        setEmail(result.email);
      } else {
        setErrors({ submit: 'Invalid activation token. Please use the link from your email.' });
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Invalid or expired activation token.';
      setErrors({ submit: errorMessage });
    } finally {
      setVerifyingToken(false);
    }
  }, [token]);

  useEffect(() => {
    // If token is provided, verify it and get email
    if (token) {
      verifyToken();
    } else if (emailParam) {
      // Legacy support: use email directly
      setEmail(emailParam);
      setVerifyingToken(false);
    } else {
      // No token or email provided
      setErrors({ submit: 'Invalid activation link. Please use the link from your email.' });
      setVerifyingToken(false);
    }
  }, [token, emailParam, verifyToken]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (errors.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Use token if available, otherwise use email (legacy support)
      await ApiService.activateAccount(token || null, password, token ? null : email);
      setIsActivated(true);
    } catch (error: any) {
      const errorMessage = error.message || 'Activation failed. Please try again.';
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
            <h1 className="activation-title">Verifying Activation Link</h1>
            <p className="activation-subtitle">Please wait while we verify your activation link...</p>
          </div>
          <PageLoader message="Verifying activation link..." />
        </div>
      </div>
    );
  }

  // Show error if no valid email after verification
  if (!email && !verifyingToken) {
    return (
      <div className="account-activation-container">
        <div className="activation-card">
          <div className="activation-header">
            <img src={mspLogo} alt="MSP Logo" className="activation-logo" />
            <h1 className="activation-title">Invalid Activation Link</h1>
            <p className="activation-subtitle">The activation link is invalid or has expired.</p>
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

  if (isActivated) {
    return (
      <div className="account-activation-container">
        <div className="activation-success-card">
          <div className="success-logo-container">
            <img src={mspLogo} alt="MSP Logo" className="success-logo" />
          </div>
          <h1 className="success-title">Welcome to MSP-MIU!</h1>
          <p className="success-message">
            Your account has been successfully activated. You can now log in and start using the platform.
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
          <h1 className="activation-title">Activate Your Account</h1>
          <p className="activation-subtitle">Set your password to complete your account setup</p>
        </div>

        <form className="activation-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email" className="input-label">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              disabled
              className="login-input input-disabled"
              readOnly
            />
          </div>

          <div className="input-group">
            <label htmlFor="password" className="input-label">Password</label>
            <div className="password-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter your password"
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
            <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
            <div className="password-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                placeholder="Confirm your password"
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
                Activating...
              </div>
            ) : (
              'Activate Account'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AccountActivation;

