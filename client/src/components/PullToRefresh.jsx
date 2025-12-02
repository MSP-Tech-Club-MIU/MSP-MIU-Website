import React from 'react';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { isCapacitor, isAndroid } from '../utils/androidBackButton';

/**
 * PullToRefresh wrapper component that only enables pull-to-refresh
 * on Android/Capacitor environments to avoid conflicts with native SwipeRefreshLayout
 */
export const PullToRefreshWrapper = ({ children }) => {
  // Only enable pull-to-refresh on Android in Capacitor environment
  const shouldEnable = isCapacitor() && isAndroid();

  const handleRefresh = async () => {
    // Reload the page when pull-to-refresh is triggered
    window.location.reload();
  };

  if (!shouldEnable) {
    // On web or non-Android, just render children without pull-to-refresh
    return <>{children}</>;
  }

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      pullingContent={
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: '20px',
          color: '#03A9F4'
        }}>
          Pull down to refresh...
        </div>
      }
      refreshingContent={
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: '20px',
          color: '#03A9F4'
        }}>
          Refreshing...
        </div>
      }
    >
      {children}
    </PullToRefresh>
  );
};

export default PullToRefreshWrapper;

