import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import ApiService from '../services/api';
import './AcceptTeamInvitation.css';
import { FiLock, FiMail, FiUser, FiCreditCard, FiAlertCircle, FiCheckCircle, FiUsers } from 'react-icons/fi';

const AcceptTeamInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [invitationData, setInvitationData] = useState(null);
  const [userExists, setUserExists] = useState(false);

  // Form state for new users
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link. No token provided.');
      setLoading(false);
      return;
    }

    verifyInvitation();
  }, [token]);

  const verifyInvitation = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await ApiService.verifyTeamInvitation(token);
      setInvitationData(response.data);
      setUserExists(response.data.userExists);
    } catch (err) {
      console.error('Error verifying invitation:', err);
      setError(err.message || 'Failed to verify invitation. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = () => {
    const errors = {};

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])/.test(password)) {
      errors.password = 'Password must contain at least one lowercase letter';
    } else if (!/(?=.*[A-Z])/.test(password)) {
      errors.password = 'Password must contain at least one uppercase letter';
    } else if (!/(?=.*\d)/.test(password)) {
      errors.password = 'Password must contain at least one number';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAcceptNewUser = async (e) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      // Create account and accept invitation - API returns token
      const response = await ApiService.acceptTeamInvitationNewUser(token, password);

      setSuccess(true);
      // Token is already stored by the API service
      setTimeout(() => {
        navigate('/competitions', { 
          state: { 
            message: 'Account created successfully! You have joined the team.' 
          }
        });
      }, 2000);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError(err.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleAcceptExistingUser = async () => {
    try {
      setProcessing(true);
      setError(null);

      // Check if user is logged in
      if (!ApiService.getAuthToken()) {
        // Redirect to login with return URL
        navigate('/login', {
          state: {
            message: 'Please log in to accept this team invitation.',
            returnUrl: `/accept-team-invitation?token=${token}`
          }
        });
        return;
      }

      await ApiService.acceptTeamInvitation(token);

      setSuccess(true);
      setTimeout(() => {
        navigate('/competitions', {
          state: { 
            message: 'Successfully joined the team!' 
          }
        });
      }, 2000);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError(err.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <section className="AcceptInvitation">
        <div className="AcceptInvitation__loader">
          <div className="spinner"></div>
          <p>Verifying invitation...</p>
        </div>
      </section>
    );
  }

  if (error && !invitationData) {
    return (
      <section className="AcceptInvitation">
        <SEO title="Invalid Invitation" description="Team invitation verification failed" />
        <div className="AcceptInvitation__error">
          <FiAlertCircle size={60} />
          <h2>Invalid Invitation</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="AcceptInvitation__homeBtn">
            Go to Home
          </button>
        </div>
      </section>
    );
  }

  if (success) {
    return (
      <section className="AcceptInvitation">
        <div className="AcceptInvitation__success">
          <FiCheckCircle size={60} />
          <h2>Success!</h2>
          <p>
            {userExists 
              ? 'You have successfully joined the team!'
              : 'Your account has been created and you have joined the team!'}
          </p>
          <p className="AcceptInvitation__redirect">Redirecting...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="AcceptInvitation">
      <SEO 
        title="Accept Team Invitation" 
        description="Join your team for the competition"
      />

      <div className="AcceptInvitation__container">
        <motion.div
          className="AcceptInvitation__card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="AcceptInvitation__header">
            <FiUsers size={48} className="AcceptInvitation__icon" />
            <h1 className="AcceptInvitation__title">Team Invitation</h1>
          </div>

          {/* Invitation Details */}
          <div className="AcceptInvitation__details">
            <div className="AcceptInvitation__infoBox">
              <h3>You've been invited to join:</h3>
              <p className="AcceptInvitation__teamName">{invitationData?.team_name}</p>
              <p className="AcceptInvitation__competitionName">
                Competition: <strong>{invitationData?.competition_title}</strong>
              </p>
              <p className="AcceptInvitation__inviter">
                Invited by: <strong>{invitationData?.inviter_name}</strong>
              </p>
            </div>
          </div>

          {/* Form - Different for new vs existing users */}
          {!userExists ? (
            // New User - Create Account
            <>
              <div className="AcceptInvitation__formHeader">
                <h2>Create Your Account</h2>
                <p>Set a password to create your competitor account and join the team</p>
              </div>

              <div className="AcceptInvitation__userInfo">
                <div className="AcceptInvitation__infoRow">
                  <FiUser size={18} />
                  <span><strong>Name:</strong> {invitationData?.invited_name || 'N/A'}</span>
                </div>
                <div className="AcceptInvitation__infoRow">
                  <FiCreditCard size={18} />
                  <span><strong>University ID:</strong> {invitationData?.invited_university_id || 'N/A'}</span>
                </div>
                <div className="AcceptInvitation__infoRow">
                  <FiMail size={18} />
                  <span><strong>Email:</strong> {invitationData?.email}</span>
                </div>
              </div>

              <form onSubmit={handleAcceptNewUser} className="AcceptInvitation__form">
                {error && (
                  <div className="AcceptInvitation__alert AcceptInvitation__alert--error">
                    <FiAlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="AcceptInvitation__formGroup">
                  <label htmlFor="password" className="AcceptInvitation__label">
                    <FiLock size={18} />
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    className={`AcceptInvitation__input ${formErrors.password ? 'error' : ''}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={processing}
                  />
                  {formErrors.password && (
                    <span className="AcceptInvitation__fieldError">{formErrors.password}</span>
                  )}
                  <small className="AcceptInvitation__hint">
                    Must be at least 8 characters with uppercase, lowercase, and numbers
                  </small>
                </div>

                <div className="AcceptInvitation__formGroup">
                  <label htmlFor="confirmPassword" className="AcceptInvitation__label">
                    <FiLock size={18} />
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    className={`AcceptInvitation__input ${formErrors.confirmPassword ? 'error' : ''}`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    disabled={processing}
                  />
                  {formErrors.confirmPassword && (
                    <span className="AcceptInvitation__fieldError">{formErrors.confirmPassword}</span>
                  )}
                </div>

                <button
                  type="submit"
                  className="AcceptInvitation__submitBtn"
                  disabled={processing}
                >
                  {processing ? 'Creating Account...' : 'Create Account & Join Team'}
                </button>
              </form>
            </>
          ) : (
            // Existing User - Just Accept
            <>
              <div className="AcceptInvitation__formHeader">
                <h2>Welcome Back!</h2>
                <p>You already have an account. Click below to join the team.</p>
              </div>

              <div className="AcceptInvitation__existingUser">
                <div className="AcceptInvitation__infoRow">
                  <FiMail size={18} />
                  <span><strong>Email:</strong> {invitationData?.email}</span>
                </div>
              </div>

              {error && (
                <div className="AcceptInvitation__alert AcceptInvitation__alert--error">
                  <FiAlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleAcceptExistingUser}
                className="AcceptInvitation__submitBtn"
                disabled={processing}
              >
                {processing ? 'Joining Team...' : 'Accept Invitation & Join Team'}
              </button>
            </>
          )}

          <div className="AcceptInvitation__footer">
            <p>Not interested?</p>
            <button 
              onClick={() => navigate('/')} 
              className="AcceptInvitation__declineBtn"
              disabled={processing}
            >
              Decline Invitation
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AcceptTeamInvitation;
