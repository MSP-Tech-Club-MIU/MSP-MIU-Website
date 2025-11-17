import React, { memo, useMemo, Suspense, lazy } from 'react';
import SEO from '../components/SEO';
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
	
	const structuredData = {
		"@context": "https://schema.org",
		"@type": "WebSite",
		"name": "MSP Tech Club - MIU",
		"url": "https://msp-miu.tech",
		"description": "A student-led innovation community powered by Microsoft Learn Student Ambassadors at Misr International University",
		"potentialAction": {
			"@type": "SearchAction",
			"target": "https://msp-miu.tech/search?q={search_term_string}",
			"query-input": "required name=search_term_string"
		}
	};
	
	return (
		<main className="HomePage" aria-label="MSP Home">
			<SEO
				title="MSP - MIU"
				description="Welcome to MSP Tech Club at Misr International University. Join our student-led innovation community to explore cutting-edge technologies, attend workshops, participate in hackathons, and develop your technical and leadership skills."
				url="https://msp-miu.tech/"
				structuredData={structuredData}
			/>
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