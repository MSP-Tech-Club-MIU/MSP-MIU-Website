import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import mspLogo from '../assets/Images/msp-logo.png';
import './NotFound.css';

const NotFound = () => {
  return (
    <main className="NotFound">
      <SEO
        title="404 - Page Not Found"
        description="The page you're looking for doesn't exist."
        noindex={true}
      />
      <div className="NotFound__container">
        <div className="NotFound__logo">
          <img
            src={mspLogo}
            alt="MSP Logo"
            className="NotFound__logoImg"
          />
        </div>
        <div className="NotFound__content">
          <h1 className="NotFound__title">404</h1>
          <h2 className="NotFound__subtitle">Page Not Found</h2>
          <p className="NotFound__message">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
          <Link to="/" className="NotFound__button">
            Go Back Home
          </Link>
        </div>
      </div>
    </main>
  );
};

export default NotFound;

