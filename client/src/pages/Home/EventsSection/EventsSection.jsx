import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import './EventsSection.css';
import { useNavigate } from 'react-router-dom';

import eventImage1 from '../../../assets/Images/MSP-MIU_Opening_Session.jpg';

// Memoized events data to prevent recreation
const mockEvents = [
  { id: '1', title: 'MSP MIU Opening Session', date: 'Nov 12, 2025', time: '12:00 PM', img: eventImage1, action: 'Details' },
];

const EventsSection = memo(() => {
  // Memoize animation props to prevent recreation
  const initialAnimation = useMemo(() => ({ opacity: 0, y: 30 }), []);
  const whileInViewAnimation = useMemo(() => ({ opacity: 1, y: 0 }), []);
  const viewportProps = useMemo(() => ({ once: true, amount: 0.2 }), []);
  const hoverAnimation = useMemo(() => ({ y: -10, boxShadow: '0 14px 40px -12px rgba(0,0,0,.65), 0 0 0 1px rgba(0,119,204,.5)' }), []);
  
  const buttonHoverAnimation = useMemo(() => ({ scale: 1.07 }), []);
  const buttonTapAnimation = useMemo(() => ({ scale: .92 }), []);
  const navigate = useNavigate();
  return (
    <section className="Events" aria-labelledby="events-heading">
      <div className="Events__head">
        <h2 id="events-heading" className="Events__title">Latest Sessions & Events</h2>
      </div>
      <div className="Events__grid">
        {mockEvents.map(ev => (
          <motion.article
            key={ev.id}
            className="EventCard"
            initial={initialAnimation}
            whileInView={whileInViewAnimation}
            viewport={viewportProps}
            whileHover={hoverAnimation}
          >
            <div 
              className="EventCard__media" 
              style={{ 
                backgroundImage: ev.img ? `url(${ev.img})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }} 
            />
            <div className="EventCard__body">
              <h3 className="EventCard__title">{ev.title}</h3>
              <p className="EventCard__meta">{ev.date} • {ev.time}</p>
              <motion.button 
                className="EventCard__btn" 
                whileHover={buttonHoverAnimation} 
                whileTap={buttonTapAnimation} 
                onClick={() => navigate(`/events/${ev.id}`)}
              >
                {ev.action}
              </motion.button>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
});

EventsSection.displayName = 'EventsSection';

export default EventsSection;
