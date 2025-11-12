import React, { memo, useMemo, Suspense, lazy } from 'react';
import HeroSection from './Home/HeroSection/HeroSection';

// Lazy load heavy sections for better performance
const FeedSection = lazy(() => import('./Home/FeedSection/FeedSection'));
const EventsSection = lazy(() => import('./Home/EventsSection/EventsSection'));
const ImagineCupSection = lazy(() => import('./Home/ImagineCupSection/ImagineCupSection'));
const DomeGallery = lazy(() => import('../components/Dome'));
// Lightweight loading component for sections
const SectionLoader = () => (
  <div style={{ 
    height: '200px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    color: '#8EC2F0',
    fontSize: '14px'
  }}>
    Loading section...
  </div>
);

export const Home = memo(() => {
	// Memoize membership flag to prevent unnecessary re-renders
	const isMember = useMemo(() => true, []); // placeholder membership flag
	
	return (
		<main className="HomePage" aria-label="MSP Home">
			<HeroSection />
			<Suspense fallback={<SectionLoader />}>
				<FeedSection isMember={isMember} />
			</Suspense>
			<Suspense fallback={<SectionLoader />}>
				<EventsSection />
			</Suspense>
			<Suspense fallback={<SectionLoader />}>
				<ImagineCupSection />
			</Suspense>
			<Suspense fallback={<SectionLoader />}>
				<DomeGallery />
			</Suspense>
		</main>
	);
});

Home.displayName = 'Home';

export default Home;