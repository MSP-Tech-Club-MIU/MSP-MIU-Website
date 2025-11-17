import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import './Events.css';
import { FiCalendar, FiClock, FiMapPin } from 'react-icons/fi';

// Import images
import eventImage1 from '../assets/Images/MSP-MIU_Opening_Session.jpg';

// Mock data for events (since no database currently)
const mockEvents = [
  {
    event_id: 1,
    name: 'Opening Ceremony',
    description: 'Join us for the grand opening ceremony of MSP Tech Club. We\'ll have guest speakers, networking opportunities, and exciting announcements about upcoming events and initiatives.',
    event_date: '2025-11-12',
    event_time: '12:00 PM',
    place: 'Main Building, Room OOA',
    event_type: 'event',
    image_url: eventImage1
  }
];

const Events = () => {
  const [filter, setFilter] = useState('all'); // all, event, session, entertainment
  const [sort, setSort] = useState('desc'); // desc, asc
  const navigate = useNavigate();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": "MSP Tech Club Events",
    "description": "Join MSP Tech Club events, workshops, sessions, and hackathons. Explore cutting-edge technologies, network with peers, and develop your skills.",
    "organizer": {
      "@type": "Organization",
      "name": "MSP Tech Club - MIU",
      "url": "https://msp-miu.tech"
    }
  };

  // Use mock data directly
  const events = mockEvents;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const filteredEvents = useMemo(() => {
    let filtered = events;
    
    if (filter !== 'all') {
      filtered = events.filter(event => event.event_type === filter);
    }
    
    return filtered.sort((a, b) => {
      const dateA = new Date(a.event_date);
      const dateB = new Date(b.event_date);
      return sort === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [events, filter, sort]);

  const handleEventClick = (eventId) => {
    navigate(`/events/${eventId}`);
  };

  const getImageSrc = (imageUrl) => {
    // Handle both imported images and URLs
    if (!imageUrl) return null;
    if (typeof imageUrl === 'string' && imageUrl.startsWith('http')) return imageUrl;
    // If it's already an imported module, return it directly
    return imageUrl;
  };

  const animationVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -30 }
  };

  return (
    <section className="EventsPage">
      <SEO
        title="Events & Sessions"
        description="Discover upcoming MSP Tech Club events, workshops, sessions, and hackathons at MIU. Join us for tech talks, hands-on workshops, networking events, and more."
        keywords="MSP events, tech workshops, hackathons, MIU events, technology sessions, student tech events, Microsoft workshops"
        url="https://msp-miu.tech/events"
        structuredData={structuredData}
      />
      <div className="EventsPage__container">
        <header className="EventsPage__header">
          <h1 className="EventsPage__title">Events & Sessions</h1>
          <p className="EventsPage__subtitle">Stay updated with our latest tech events, workshops, and sessions</p>
        </header>

        <div className="EventsPage__controls">
          <div className="EventsPage__filters">
            <button
              className={`EventsPage__filterBtn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`EventsPage__filterBtn ${filter === 'event' ? 'active' : ''}`}
              onClick={() => setFilter('event')}
            >
              Events
            </button>
            <button
              className={`EventsPage__filterBtn ${filter === 'session' ? 'active' : ''}`}
              onClick={() => setFilter('session')}
            >
              Sessions
            </button>
            <button
              className={`EventsPage__filterBtn ${filter === 'entertainment' ? 'active' : ''}`}
              onClick={() => setFilter('entertainment')}
            >
              Entertainment
            </button>
          </div>

          <div className="EventsPage__sort">
            <label htmlFor="sort-select" className="EventsPage__sortLabel">
              Sort by:
            </label>
            <select
              id="sort-select"
              className="EventsPage__sortSelect"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>

        {filteredEvents.length === 0 && (
          <div className="EventsPage__empty">
            <FiCalendar />
            <p>No events found</p>
            <span>Check back later for upcoming events!</span>
          </div>
        )}

        <div className="EventsPage__grid">
          <AnimatePresence mode="popLayout">
            {filteredEvents.map((event) => (
              <motion.article
                key={event.event_id}
                className="EventCard"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={animationVariants}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                onClick={() => handleEventClick(event.event_id)}
              >
                <div className="EventCard__media">
                  {event.image_url ? (
                    <img 
                      src={getImageSrc(event.image_url)} 
                      alt={event.name}
                      className="EventCard__image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <div 
                    className="EventCard__imagePlaceholder"
                    style={{ display: event.image_url ? 'none' : 'block' }}
                  >
                    <FiCalendar />
                  </div>
                  <div className={`EventCard__badge EventCard__badge--${event.event_type}`}>
                    {event.event_type}
                  </div>
                </div>
                <div className="EventCard__body">
                  <h3 className="EventCard__title">{event.name}</h3>
                  <div className="EventCard__meta">
                    <span className="EventCard__metaItem">
                      <FiCalendar />
                      {formatDate(event.event_date)}
                    </span>
                    {event.event_time && (
                      <span className="EventCard__metaItem">
                        <FiClock />
                        {event.event_time}
                      </span>
                    )}
                    {event.place && (
                      <span className="EventCard__metaItem">
                        <FiMapPin />
                        {event.place}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="EventCard__description">
                      {event.description.length > 100
                        ? `${event.description.substring(0, 100)}...`
                        : event.description}
                    </p>
                  )}
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default Events;
