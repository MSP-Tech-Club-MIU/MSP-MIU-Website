import React from 'react';

const PageLoader = ({ message = 'Loading...' }) => {
  return (
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
      <p style={{ margin: 0, fontSize: '14px' }}>{message}</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PageLoader;

