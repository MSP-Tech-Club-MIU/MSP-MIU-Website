import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import PageLoader from '../components/PageLoader';
import WebmailAdminTab from './Admin/WebmailAdminTab';
import ApiService from '../services/api';
import { MdArrowBack, MdAdminPanelSettings } from 'react-icons/md';
import './Admin/WebmailAdminTab.css';

export default function MailPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    async function checkAuth() {
      if (!ApiService.isAuthenticated()) {
        navigate('/login?redirect=/mail');
        return;
      }
      try {
        const access = await ApiService.checkAdminAccess();
        if (access?.hasAnyAdminAccess) {
          setAuthorized(true);
        } else {
          // Check if board or admin
          const profile = await ApiService.getUserProfile();
          if (['admin', 'board'].includes(profile?.role)) {
            setAuthorized(true);
          } else {
            setAuthorized(false);
          }
        }
      } catch (err) {
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [navigate]);

  if (loading) {
    return <PageLoader message="Loading Webmail..." />;
  }

  if (!authorized) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', color: '#eaf2ff' }}>
        <SEO title="Access Denied | MSP MIU" />
        <h2 style={{ fontSize: '1.8rem', color: '#ff5b1f' }}>Access Denied</h2>
        <p style={{ color: '#94a3b8', margin: '14px 0 24px' }}>
          The Webmail mailing client is restricted to authorized MSP MIU Board and Admin members.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            background: '#0d7bd8',
            color: '#fff',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px', minHeight: '85vh' }}>
      <SEO title="Webmail | MSP MIU" description="Send emails and attachments to any recipient via MSP MIU Mailer." />

      {/* Top Banner Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
          gap: 12
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/admin')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 10,
            background: 'rgba(11, 26, 43, 0.7)',
            border: '1px solid rgba(74, 166, 255, 0.25)',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#03a9f4';
            e.currentTarget.style.borderColor = '#03a9f4';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.borderColor = 'rgba(74, 166, 255, 0.25)';
          }}
        >
          <MdArrowBack />
          <span>Admin Panel</span>
        </button>

        {alert && (
          <div
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: '0.88rem',
              fontWeight: 500,
              background: alert.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : alert.type === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              color: alert.type === 'error' ? '#ef4444' : alert.type === 'warning' ? '#f59e0b' : '#22c55e',
              border: `1px solid ${alert.type === 'error' ? 'rgba(239,68,68,0.3)' : alert.type === 'warning' ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}`
            }}
          >
            {alert.message}
          </div>
        )}
      </div>

      {/* Webmail Client */}
      <WebmailAdminTab onAlert={setAlert} />
    </div>
  );
}
