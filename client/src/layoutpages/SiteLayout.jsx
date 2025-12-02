import React, { memo } from 'react';
import { Navbar } from './Navbar/Navbar';
import { Footer } from './Footer/Footer';
import PullToRefreshWrapper from '../components/PullToRefresh';
import './SiteLayout.css';

export const SiteLayout = memo(({ children }) => {
  return (
    <div className="SiteLayout">
      <Navbar />
      <PullToRefreshWrapper>
        <main className="SiteLayout__main" id="main-content" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </PullToRefreshWrapper>
    </div>
  );
});

SiteLayout.displayName = 'SiteLayout';

export default SiteLayout;
