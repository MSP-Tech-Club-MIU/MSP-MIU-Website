import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import './EventsSection.css';
import { useNavigate } from 'react-router-dom';
import ApiService from '../../../services/api';

import mspLogo from '../../../assets/Images/msp-logo.png';

const EventsSection = memo(() => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch events from API (only once)
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const result = await ApiService.getEvents({ limit: 3, page: 1 });
        const list = Array.isArray(result) ? result : (result.data || []);
        
        // Map database fields to component fields (exactly like Events.jsx)
        const mappedEvents = list.map(event => ({
          event_id: event.event_id,
          name: event.name,
          description: event.description,
          event_date: event.event_date,
          place: event.location,
          // Map category: Workshop -> event, Session -> session, Entertainment -> entertainment
          event_type: event.category === 'Workshop' ? 'event' : 
                     event.category === 'Session' ? 'session' : 
                     event.category === 'Entertainment' ? 'entertainment' : 'event',
          // Use main_image from database if available, otherwise fallback to MSP logo
          image_url: (event.main_image && event.main_image.trim()) ? event.main_image : mspLogo,
          category: event.category
        }));
        
        console.log('Fetched events:', mappedEvents.length);
        setEvents(mappedEvents);
      } catch (err) {
        console.error('Error fetching events:', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);


  // Format date helper (exactly like Events.jsx)
  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }, []);

  // Get image source helper (exactly like Events.jsx)
  const getImageSrc = useCallback((imageUrl) => {
    // Handle both imported images and URLs
    if (!imageUrl) return null;
    if (typeof imageUrl === 'string' && imageUrl.startsWith('http')) return imageUrl;
    // If it's already an imported module, return it directly
    return imageUrl;
  }, []);

  // Memoize animation props to prevent recreation
  const initialAnimation = useMemo(() => ({ opacity: 0, y: 30 }), []);
  const whileInViewAnimation = useMemo(() => ({ opacity: 1, y: 0 }), []);
  const viewportProps = useMemo(() => ({ once: true, amount: 0.2 }), []);
  const hoverAnimation = useMemo(() => ({ y: -10, boxShadow: '0 14px 40px -12px rgba(0,0,0,.65), 0 0 0 1px rgba(0,119,204,.5)' }), []);
  const buttonHoverAnimation = useMemo(() => ({ scale: 1.07 }), []);
  const buttonTapAnimation = useMemo(() => ({ scale: .92 }), []);

  return (
    <section className="Events" aria-labelledby="events-heading">
      <div className="Events__head">
        <h2 id="events-heading" className="Events__title">Latest Sessions & Events</h2>
      </div>
      <div className="Events__grid">
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#8EC2F0' }}>
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#8EC2F0' }}>
            No upcoming events at the moment.
          </div>
        ) : (
          events.map(ev => {
            const imageSrc = getImageSrc(ev.image_url);
            return (
              <motion.article
                key={ev.event_id}
                className="EventCard"
                initial={initialAnimation}
                whileInView={whileInViewAnimation}
                viewport={viewportProps}
                whileHover={hoverAnimation}
              >
                <div 
                  className="EventCard__media" 
                  style={{ 
                    backgroundImage: imageSrc ? `url(${imageSrc})` : 'none',
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }} 
                />
                <div className="EventCard__body">
                  <h3 className="EventCard__title">{ev.name}</h3>
                  <p className="EventCard__meta">{formatDate(ev.event_date)}</p>
                  <motion.button 
                    className="EventCard__btn" 
                    whileHover={buttonHoverAnimation} 
                    whileTap={buttonTapAnimation} 
                    onClick={() => navigate(`/events/${ev.event_id}`)}
                  >
                    Details
                  </motion.button>
                </div>
              </motion.article>
            );
          })
        )}
      </div>
      {!loading && events.length > 0 && (
        <div className="Events__seeMoreContainer">
          <motion.button
            className="Events__seeMoreBtn"
            onClick={() => navigate('/events')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            See More Events
          </motion.button>
        </div>
      )}
    </section>
  );
});

EventsSection.displayName = 'EventsSection';

export default EventsSection;
