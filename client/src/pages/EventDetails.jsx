import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './EventDetails.css';
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiDownload,
  FiFile,
  FiFileText,
  FiImage,
  FiVideo,
  FiMusic,
  FiUserPlus,
  FiAlertTriangle,
  FiMessageCircle,
  FiSend
} from 'react-icons/fi';
import ApiService from '../services/api';
import { useModal } from '../context/ModalContext';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import SEO from '../components/SEO';

import mspLogo from '../assets/Images/msp-logo.png';

const EventDetails = () => {
  const { alert: modalAlert } = useModal();
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await ApiService.getEventById(parseInt(id, 10));

        const mappedEvent = {
          event_id: data.event_id,
          name: data.name,
          description: data.description,
          event_date: data.event_date,
          place: data.location,
          event_type:
            data.category === 'Workshop'
              ? 'event'
              : data.category === 'Session'
                ? 'session'
                : data.category === 'Entertainment'
                  ? 'entertainment'
                  : 'event',
          image_url: data.main_image && data.main_image.trim() ? data.main_image : mspLogo,
          category: data.category,
          registration_enabled:
            data.registration_enabled !== undefined ? data.registration_enabled : true,
          upload_file: data.upload_file || null
        };

        setEvent(mappedEvent);

        if (data.upload_file && data.upload_file.trim()) {
          const decodedPath = decodeURIComponent(data.upload_file);
          const fileName =
            decodedPath.split('/').pop() || decodedPath.split('\\').pop() || decodedPath;
          const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

          let fileType = 'document';
          if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(fileExtension)) {
            fileType = 'image';
          } else if (['mp4', 'webm', 'ogg'].includes(fileExtension)) {
            fileType = 'video';
          } else if (['mp3', 'wav'].includes(fileExtension)) {
            fileType = 'audio';
          }

          setFiles([
            {
              file_id: 1,
              file_name: decodedPath,
              file_display_name: fileName,
              file_type: fileType,
              file_size: 'N/A',
              uploaded_at: data.created_at
                ? new Date(data.created_at).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0]
            }
          ]);
        } else {
          setFiles([]);
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        setError(err.message || 'Failed to load event');
        setEvent(null);
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchEvent();
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(`${dateString}T00:00:00`);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getImageSrc = (imageUrl) => {
    if (!imageUrl) return null;
    if (
      typeof imageUrl === 'string' &&
      (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))
    ) {
      return imageUrl;
    }
    if (typeof imageUrl === 'string') {
      const cleanPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
      return `/${cleanPath}`;
    }
    return imageUrl;
  };

  const getFileSrc = (fileName) => {
    if (!fileName) return null;
    if (
      typeof fileName === 'string' &&
      (fileName.startsWith('http://') || fileName.startsWith('https://'))
    ) {
      return fileName;
    }
    if (typeof fileName === 'string') {
      const cleanPath = fileName.startsWith('/') ? fileName.slice(1) : fileName;
      const filePath = cleanPath.startsWith('assets/') ? cleanPath : `assets/${cleanPath}`;
      return `/${filePath
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/')}`;
    }
    return fileName;
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

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'document':
        return <FiFileText />;
      case 'image':
        return <FiImage />;
      case 'video':
        return <FiVideo />;
      case 'audio':
        return <FiMusic />;
      default:
        return <FiFile />;
    }
  };

  const handleDownloadFile = (file) => {
    const filePath = getFileSrc(file.file_name);
    if (!filePath) return;
    const link = document.createElement('a');
    link.href = filePath;
    link.download = file.file_display_name || file.file_name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      await modalAlert({
        title: 'Feedback Required',
        message: 'Please enter your feedback before submitting.',
        type: 'warning'
      });
      return;
    }
    if (feedbackText.trim().length > 2000) {
      await modalAlert({
        title: 'Feedback Too Long',
        message: 'Feedback must be less than 2000 characters.',
        type: 'warning'
      });
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      await ApiService.addEventFeedback(event.event_id, feedbackText.trim());
      setFeedbackText('');
      await modalAlert({
        title: 'Feedback Submitted',
        message: 'Thank you for your feedback! It helps us improve our events.',
        type: 'success'
      });
    } catch (err) {
      console.error('Error submitting feedback:', err);
      await modalAlert({
        title: 'Submission Failed',
        message: 'Failed to submit feedback: ' + (err.message || 'Unknown error'),
        type: 'danger'
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <section className="EventDetailsPage">
        <div className="EventDetailsPage__container">
          <BackButton to="/events" label="Back to Events" />
          <PageLoader message="Loading event details..." />
        </div>
      </section>
    );
  }

  if (error || !event) {
    return (
      <section className="EventDetailsPage">
        <div className="EventDetailsPage__container">
          <BackButton to="/events" label="Back to Events" />
          <div className="EventDetailsPage__error">
            <FiCalendar />
            <p>{error || 'Event not found'}</p>
            <span>The event you're looking for doesn't exist or has been removed</span>
          </div>
        </div>
      </section>
    );
  }

  const imageSrc = getImageSrc(event.image_url);
  const absoluteImage =
    imageSrc && (imageSrc.startsWith('http://') || imageSrc.startsWith('https://'))
      ? imageSrc
      : imageSrc
        ? `https://msp-miu.tech${imageSrc.startsWith('/') ? imageSrc : `/${imageSrc}`}`
        : undefined;
  const eventStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    description: event.description || `Join ${event.name} with MSP Tech Club at MIU.`,
    startDate: event.event_date,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    image: absoluteImage ? [absoluteImage] : undefined,
    location: {
      '@type': 'Place',
      name: event.place || 'Misr International University',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Cairo',
        addressCountry: 'EG'
      }
    },
    organizer: {
      '@type': 'Organization',
      name: 'MSP Tech Club — MIU',
      url: 'https://msp-miu.tech'
    }
  };

  return (
    <section className="EventDetailsPage">
      <SEO
        title={event.name}
        description={event.description || `Join ${event.name} with MSP Tech Club at Misr International University.`}
        keywords={`MSP event, ${event.name}, ${event.category || 'event'}, MIU`}
        url={`/events/${event.event_id}`}
        image={absoluteImage}
        type="article"
        structuredData={eventStructuredData}
      />
      <div className="EventDetailsPage__container">
        <BackButton to="/events" label="Back to Events" />

        <motion.article
          className="EventDetails"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {event.image_url && (
            <div className="EventDetails__hero" style={{ position: 'relative' }}>
              <div
                className="EventDetails__image"
                style={{
                  backgroundImage: imageSrc ? `url("${imageSrc}")` : 'none',
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              />
              <div
                className="EventDetails__imagePlaceholder"
                style={{ display: imageSrc ? 'none' : 'flex' }}
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

              <div className="EventDetails__infoItem">
                <FiMapPin />
                <div>
                  <span className="EventDetails__infoLabel">Location</span>
                  <span className="EventDetails__infoValue">{event.place || 'Not specified'}</span>
                </div>
              </div>
            </div>

            <div className="EventDetails__description">
              <h2>About This Event</h2>
              <p>{event.description || 'No description provided.'}</p>
            </div>

            {event.registration_enabled !== false ? (
              <div className="EventDetails__register">
                <motion.button
                  className="EventDetails__registerBtn"
                  onClick={() => navigate(`/attendance-request?event_id=${event.event_id}`)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiUserPlus />
                  Register for Attendance Request
                </motion.button>
              </div>
            ) : (
              <div
                className="EventDetails__register"
                style={{
                  padding: '1rem',
                  background: 'rgba(255, 193, 7, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                  textAlign: 'center'
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: '#ffc107',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <FiAlertTriangle />
                  Registration for this event is currently closed
                </p>
              </div>
            )}

            <div
              style={{
                marginTop: '1.5rem',
                padding: '1.5rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <h3
                style={{
                  margin: '0 0 1rem 0',
                  fontSize: '1.2rem',
                  color: '#8EC2F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <FiMessageCircle />
                Share Your Feedback
              </h3>
              <form onSubmit={handleSubmitFeedback}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="What did you think about this event? Share your thoughts, suggestions, or experiences..."
                    rows="4"
                    maxLength={2000}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(142, 194, 240, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.95rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      minHeight: '100px'
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ color: '#8EC2F0', fontSize: '0.85rem' }}>
                      {feedbackText.length}/2000 characters
                    </span>
                    <motion.button
                      type="submit"
                      disabled={!feedbackText.trim() || isSubmittingFeedback}
                      whileHover={{ scale: isSubmittingFeedback ? 1 : 1.02 }}
                      whileTap={{ scale: isSubmittingFeedback ? 1 : 0.98 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        background:
                          feedbackText.trim() && !isSubmittingFeedback
                            ? 'rgba(142, 194, 240, 0.2)'
                            : 'rgba(255, 255, 255, 0.1)',
                        color:
                          feedbackText.trim() && !isSubmittingFeedback
                            ? '#8EC2F0'
                            : 'rgba(142, 194, 240, 0.5)',
                        border: `1px solid ${
                          feedbackText.trim() && !isSubmittingFeedback
                            ? 'rgba(142, 194, 240, 0.3)'
                            : 'rgba(142, 194, 240, 0.1)'
                        }`,
                        borderRadius: '8px',
                        cursor:
                          feedbackText.trim() && !isSubmittingFeedback
                            ? 'pointer'
                            : 'not-allowed',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        opacity: feedbackText.trim() && !isSubmittingFeedback ? 1 : 0.6
                      }}
                    >
                      <FiSend />
                      {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                    </motion.button>
                  </div>
                </div>
              </form>
            </div>

            <div className="EventDetails__files">
              <div className="EventDetails__filesHeader">
                <h2>Event Files</h2>
              </div>

              {files.length === 0 ? (
                <div className="EventDetails__filesEmpty">
                  <FiFile />
                  <p>No files available yet</p>
                  <span>Files will appear here once uploaded</span>
                </div>
              ) : (
                <div className="EventDetails__filesList">
                  {files.map((file) => (
                    <div key={file.file_id} className="EventDetails__fileItem">
                      <div className="EventDetails__fileInfo">
                        <span className="EventDetails__fileIcon">
                          {getFileIcon(file.file_type)}
                        </span>
                        <div className="EventDetails__fileDetails">
                          <span className="EventDetails__fileName">
                            {file.file_display_name || file.file_name}
                          </span>
                          <span className="EventDetails__fileMeta">
                            {file.file_size} • {file.file_type} • Uploaded on {file.uploaded_at}
                          </span>
                        </div>
                      </div>
                      <div className="EventDetails__fileActions">
                        <button
                          className="EventDetails__fileDownloadBtn"
                          onClick={() => handleDownloadFile(file)}
                          title="Download"
                        >
                          <FiDownload />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.article>
      </div>
    </section>
  );
};

export default EventDetails;
