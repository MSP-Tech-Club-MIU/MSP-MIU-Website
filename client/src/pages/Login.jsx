import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LoginCard from '../components/LoginCard';
import ApiService from '../services/api';
import './PageBase.css';

export const Login = () => {
  const [showLoginCard, setShowLoginCard] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from?.pathname;
  const postLoginRedirect =
    typeof fromPath === 'string' && fromPath.startsWith('/') && !fromPath.startsWith('//')
      ? fromPath
      : undefined;

  useEffect(() => {
    // Auto-open login card when component mounts
    setShowLoginCard(true);
  }, []);

  const handleClose = () => {
    setShowLoginCard(false);
    // Check if user is authenticated after a brief delay
    // If login was successful, LoginCard redirects to admin (when allowed) or /profile
    // If user just closed the card, navigate to home
    setTimeout(() => {
      if (!ApiService.isAuthenticated()) {
        navigate('/');
      }
    }, 100);
  };

  return (
    <section className="PageBase">
      <LoginCard isOpen={showLoginCard} onClose={handleClose} postLoginRedirect={postLoginRedirect} />
    </section>
  );
};

export default Login;