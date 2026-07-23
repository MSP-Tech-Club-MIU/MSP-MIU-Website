import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import Pagination from '../components/Pagination';
import './Events.css';
import { FiCalendar, FiClock, FiMapPin } from 'react-icons/fi';

// Import images
import mspLogo from '../assets/Images/msp-logo.png';

const PAGE_SIZE = 6;

const FILTER_TO_CATEGORY = {
  event: 'Workshop',
  session: 'Session',
  entertainment: 'Entertainment',
};

const Events = () => {
  const [events, setEvents] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, event, session, entertainment
  const [sort, setSort] = useState('desc'); // desc, asc
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const hasLoadedOnceRef = useRef(false);
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

  // Fetch one page of events at a time (never the full list)
  useEffect(() => {
    let cancelled = false;

    const fetchEvents = async () => {
      const isPageChange = hasLoadedOnceRef.current;

      try {
        if (isPageChange) {
          setPageLoading(true);
          setEvents([]);
          setPagination((prev) =>
            prev
              ? {
                  ...prev,
                  page,
                  hasPrev: page > 1,
                  hasNext: page < prev.totalPages,
                }
              : prev
          );
        } else {
          setInitialLoading(true);
        }
        setError(null);

        const filters = { page, limit: PAGE_SIZE };
        if (filter !== 'all' && FILTER_TO_CATEGORY[filter]) {
          filters.category = FILTER_TO_CATEGORY[filter];
        }

        const result = await ApiService.getEvents(filters);
        if (cancelled) return;

        const list = Array.isArray(result) ? result : (result.data || []);
        const mappedEvents = list.map((event) => ({
          event_id: event.event_id,
          name: event.name,
          description: event.description,
          event_date: event.event_date,
          place: event.location,
          event_type:
            event.category === 'Workshop'
              ? 'event'
              : event.category === 'Session'
                ? 'session'
                : event.category === 'Entertainment'
                  ? 'entertainment'
                  : 'event',
          image_url:
            event.main_image && event.main_image.trim() ? event.main_image : mspLogo,
          category: event.category,
        }));

        setEvents(mappedEvents);

        const meta = Array.isArray(result) ? null : result.pagination || null;
        // One page of results → no pagination UI
        if (!meta || meta.totalPages <= 1 || (typeof meta.total === 'number' && meta.total <= PAGE_SIZE)) {
          setPagination(null);
        } else {
          setPagination(meta);
        }
        hasLoadedOnceRef.current = true;
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching events:', err);
        setError(err.message || 'Failed to load events');
        setEvents([]);
        if (!hasLoadedOnceRef.current) {
          setPagination(null);
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
          setPageLoading(false);
        }
      }
    };

    fetchEvents();
    return () => {
      cancelled = true;
    };
  }, [page, filter]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const filteredEvents = useMemo(() => {
    // Category filtering is handled server-side; sort current page client-side
    return [...events].sort((a, b) => {
      const dateA = new Date(a.event_date);
      const dateB = new Date(b.event_date);
      return sort === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [events, sort]);

  const handleFilterChange = (nextFilter) => {
    if (nextFilter === filter) return;
    hasLoadedOnceRef.current = false;
    setPagination(null);
    setPage(1);
    setFilter(nextFilter);
  };

  const handlePageChange = (nextPage) => {
    if (pageLoading || nextPage === page) return;
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      <BackButton to="/" label="Back to Home" />
      <SEO
        title="Events & Sessions"
        description="Discover upcoming MSP Tech Club events, workshops, sessions, and hackathons at MIU. Join us for tech talks, hands-on workshops, networking events, and more."
        keywords="MSP events, tech workshops, hackathons, MIU events, technology sessions, student tech events, Microsoft workshops"
        url="https://msp-miu.tech/events"
        structuredData={structuredData}
      />
      <div className="EventsPage__container">
        <header className="EventsPage__header">
          <div>
            <h1 className="EventsPage__title">Events & Sessions</h1>
            <p className="EventsPage__subtitle">Stay updated with our latest tech events, workshops, and sessions</p>
          </div>
        </header>

        <div className="EventsPage__controls">
          <div className="EventsPage__filters">
            <button
              className={`EventsPage__filterBtn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              All
            </button>
            <button
              className={`EventsPage__filterBtn ${filter === 'event' ? 'active' : ''}`}
              onClick={() => handleFilterChange('event')}
            >
              Events
            </button>
            <button
              className={`EventsPage__filterBtn ${filter === 'session' ? 'active' : ''}`}
              onClick={() => handleFilterChange('session')}
            >
              Sessions
            </button>
            <button
              className={`EventsPage__filterBtn ${filter === 'entertainment' ? 'active' : ''}`}
              onClick={() => handleFilterChange('entertainment')}
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

        {initialLoading && <PageLoader message="Loading events..." />}

        {error && !initialLoading && !pageLoading && (
          <div className="EventsPage__empty">
            <FiCalendar />
            <p>Error loading events</p>
            <span>{error}</span>
          </div>
        )}

        {!initialLoading && !error && !pageLoading && filteredEvents.length === 0 && (
          <div className="EventsPage__empty">
            <FiCalendar />
            <p>No events found</p>
            <span>Check back later for upcoming events!</span>
          </div>
        )}

        {!initialLoading && !error && (
          <>
            {pageLoading ? (
              <div className="EventsPage__pageLoader" aria-live="polite" aria-busy="true">
                <div className="EventsPage__spinner" />
                <p>Loading page {page}...</p>
              </div>
            ) : (
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
            )}
            {pagination?.totalPages > 1 && (
              <Pagination
                pagination={pagination}
                onPageChange={handlePageChange}
                disabled={pageLoading}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default Events;
