import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './EventDetails.css';
import { FiCalendar, FiClock, FiMapPin, FiArrowLeft } from 'react-icons/fi';

// Import images
import eventImage1 from '../assets/Images/IMG_3985.jpg';
import eventImage2 from '../assets/Images/2.jpg';
import eventImage3 from '../assets/Images/3.jpg';

// Mock data (same as Events page)
const mockEvents = [
  {
    event_id: 1,
    name: 'Opening Ceremony',
    description: 'Join us for the grand opening ceremony of MSP Tech Club. We\'ll have guest speakers, networking opportunities, and exciting announcements about upcoming events and initiatives. This is a special event where we\'ll introduce our mission, vision, and the amazing opportunities that await our members.',
    event_date: '2025-11-12',
    event_time: '12:00 PM',
    place: 'Main Building, Room OOA',
    event_type: 'event',
    image_url: eventImage1
  },
  {
    event_id: 2,
    name: 'Azure Cloud Workshop',
    description: 'Learn the fundamentals of Microsoft Azure cloud computing. Hands-on session covering virtual machines, storage, and networking. Perfect for beginners and those looking to expand their cloud knowledge.',
    event_date: '2025-02-20',
    event_time: '4:00 PM',
    place: 'Lab 302, Building B',
    event_type: 'session',
    image_url: eventImage2
  },
  {
    event_id: 3,
    name: 'Tech Games Night',
    description: 'Fun-filled evening with tech-themed games, competitions, and prizes. Great opportunity to network and have fun with fellow members. Food and drinks will be provided.',
    event_date: '2025-02-25',
    event_time: '6:00 PM',
    place: 'Student Center',
    event_type: 'entertainment',
    image_url: eventImage3
  }
];

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Find event from mock data
  const event = mockEvents.find(e => e.event_id === parseInt(id));

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const getImageSrc = (imageUrl) => {
    // Handle both imported images and URLs
    if (!imageUrl) return null;
    if (typeof imageUrl === 'string' && imageUrl.startsWith('http')) return imageUrl;
    // If it's already an imported module, return it directly
    return imageUrl;
  };

  const getEventTypeColor = (type) => {
    switch (type) {
      case 'event':
        return '#03A9F4';
      case 'session':
        return '#84bd00';
      case 'entertainment':
        return '#ffbf00';
      default:
        return '#03A9F4';
    }
  };

  if (!event) {
    return (
      <section className="EventDetailsPage">
        <div className="EventDetailsPage__container">
          <div className="EventDetailsPage__error">
            <p>Event not found</p>
            <button onClick={() => navigate('/events')} className="EventDetailsPage__backBtn">
              <FiArrowLeft />
              Back to Events
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="EventDetailsPage">
      <div className="EventDetailsPage__container">
        <button 
          onClick={() => navigate('/events')} 
          className="EventDetailsPage__backBtn"
        >
          <FiArrowLeft />
          Back to Events
        </button>

        <motion.article 
          className="EventDetails"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {event.image_url && (
            <div className="EventDetails__hero">
              <img 
                src={getImageSrc(event.image_url)} 
                alt={event.name}
                className="EventDetails__image"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div 
                className="EventDetails__imagePlaceholder"
                style={{ display: event.image_url ? 'none' : 'flex' }}
              >
                <FiCalendar />
              </div>
              <div 
                className="EventDetails__badge"
                style={{ backgroundColor: getEventTypeColor(event.event_type) }}
              >
                {event.event_type}
              </div>
            </div>
          )}

          <div className="EventDetails__content">
            <header className="EventDetails__header">
              <h1 className="EventDetails__title">{event.name}</h1>
            </header>

            <div className="EventDetails__info">
              <div className="EventDetails__infoItem">
                <FiCalendar />
                <div>
                  <span className="EventDetails__infoLabel">Date</span>
                  <span className="EventDetails__infoValue">{formatDate(event.event_date)}</span>
                </div>
              </div>

              {event.event_time && (
                <div className="EventDetails__infoItem">
                  <FiClock />
                  <div>
                    <span className="EventDetails__infoLabel">Time</span>
                    <span className="EventDetails__infoValue">{event.event_time}</span>
                  </div>
                </div>
              )}

              {event.place && (
                <div className="EventDetails__infoItem">
                  <FiMapPin />
                  <div>
                    <span className="EventDetails__infoLabel">Location</span>
                    <span className="EventDetails__infoValue">{event.place}</span>
                  </div>
                </div>
              )}
            </div>

            {event.description && (
              <div className="EventDetails__description">
                <h2>About This Event</h2>
                <p>{event.description}</p>
              </div>
            )}
          </div>
        </motion.article>
      </div>
    </section>
  );
};

export default EventDetails;
