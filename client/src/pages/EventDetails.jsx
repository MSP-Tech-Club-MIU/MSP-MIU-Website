import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './EventDetails.css';
import { FiCalendar, FiClock, FiMapPin, FiArrowLeft, FiUpload, FiDownload, FiTrash2, FiFile, FiFileText, FiImage, FiVideo, FiMusic, FiUserPlus, FiAlertTriangle } from 'react-icons/fi';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';

// Import images
import mspLogo from '../assets/Images/msp-logo.png';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [files, setFiles] = useState([]); // Start with empty files to show empty state
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState('document');
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSubmissionsConfirm, setShowDeleteSubmissionsConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingSubmissions, setIsDeletingSubmissions] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch event from API
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await ApiService.getEventById(parseInt(id));
        
        // Map database fields to component fields
        const mappedEvent = {
          event_id: data.event_id,
          name: data.name,
          description: data.description,
          event_date: data.event_date,
          place: data.location,
          // Map category: Workshop -> event, Session -> session, Entertainment -> entertainment
          event_type: data.category === 'Workshop' ? 'event' : 
                     data.category === 'Session' ? 'session' : 
                     data.category === 'Entertainment' ? 'entertainment' : 'event',
          // Use main_image from database if available, otherwise fallback to MSP logo
          image_url: (data.main_image && data.main_image.trim()) ? data.main_image : mspLogo,
          category: data.category,
          registration_enabled: data.registration_enabled !== undefined ? data.registration_enabled : true
        };
        
        setEvent(mappedEvent);
      } catch (err) {
        console.error('Error fetching event:', err);
        setError(err.message || 'Failed to load event');
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEvent();
    }
  }, [id]);

  // Check user role
  useEffect(() => {
    const checkUserRole = async () => {
      if (ApiService.isAuthenticated()) {
        try {
          const user = await ApiService.getProfile();
          setUserRole(user.role);
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
    };
    checkUserRole();
  }, []);

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

  const isBoardOrAdmin = userRole === 'board' || userRole === 'admin';

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

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    // Simulate upload delay
    setTimeout(() => {
      const newFile = {
        file_id: files.length + 1,
        file_name: selectedFile.name,
        file_type: fileType,
        file_size: (selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB',
        uploaded_at: new Date().toISOString().split('T')[0],
        uploaded_by: userRole === 'admin' ? 'Admin' : 'Board Member'
      };
      setFiles([...files, newFile]);
      setSelectedFile(null);
      setFileType('document');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowUpload(false);
      setIsUploading(false);
    }, 1000);
  };

  const handleDeleteFile = (fileId) => {
    setFiles(files.filter(f => f.file_id !== fileId));
  };

  const handleDownloadFile = (file) => {
    // Mock download - in real app, this would download the file
    console.log('Downloading file:', file.file_name);
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = '#';
    link.download = file.file_name;
    link.click();
  };

  const handleDeleteEvent = async () => {
    try {
      setIsDeleting(true);
      await ApiService.deleteEvent(event.event_id);
      // Redirect to events page after successful deletion
      navigate('/events');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event: ' + (error.message || 'Unknown error'));
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleToggleRegistration = async () => {
    try {
      setIsDeletingSubmissions(true);
      const newStatus = !event.registration_enabled;
      await ApiService.updateEvent(event.event_id, {
        registration_enabled: newStatus
      });
      
      // Update local event state
      setEvent(prev => ({
        ...prev,
        registration_enabled: newStatus
      }));
      
      alert(`Registration ${newStatus ? 'enabled' : 'disabled'} for this event`);
      setIsDeletingSubmissions(false);
      setShowDeleteSubmissionsConfirm(false);
    } catch (error) {
      console.error('Error toggling registration:', error);
      alert('Failed to toggle registration: ' + (error.message || 'Unknown error'));
      setIsDeletingSubmissions(false);
      setShowDeleteSubmissionsConfirm(false);
    }
  };

  // Loading state
  if (loading) {
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
          <PageLoader message="Loading event details..." />
        </div>
      </section>
    );
  }

  // Error state or event not found
  if (error || !event) {
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
          <div className="EventDetailsPage__error">
            <FiCalendar />
            <p>{error || 'Event not found'}</p>
            <span>The event you're looking for doesn't exist or has been removed</span>
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

            {/* Register Button - Only show if registration is enabled */}
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
              <div className="EventDetails__register" style={{ 
                padding: '1rem', 
                background: 'rgba(255, 193, 7, 0.1)', 
                borderRadius: '12px',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                textAlign: 'center'
              }}>
                <p style={{ margin: 0, color: '#ffc107', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <FiAlertTriangle />
                  Registration for this event is currently closed
                </p>
              </div>
            )}

            {/* Admin/Board Actions */}
            {isBoardOrAdmin && (
              <div className="EventDetails__adminActions" style={{ 
                marginTop: '2rem', 
                padding: '1.5rem', 
                background: 'rgba(255, 255, 255, 0.05)', 
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ 
                  margin: '0 0 1rem 0', 
                  fontSize: '1.1rem', 
                  color: '#8EC2F0',
                  fontWeight: '600'
                }}>
                  Admin Actions
                </h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <motion.button
                    onClick={() => setShowDeleteSubmissionsConfirm(true)}
                    disabled={isDeletingSubmissions}
                    whileHover={{ scale: isDeletingSubmissions ? 1 : 1.02 }}
                    whileTap={{ scale: isDeletingSubmissions ? 1 : 0.98 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.5rem',
                      background: event.registration_enabled 
                        ? 'rgba(255, 193, 7, 0.2)' 
                        : 'rgba(76, 175, 80, 0.2)',
                      color: event.registration_enabled ? '#ffc107' : '#4caf50',
                      border: `1px solid ${event.registration_enabled ? 'rgba(255, 193, 7, 0.3)' : 'rgba(76, 175, 80, 0.3)'}`,
                      borderRadius: '8px',
                      cursor: isDeletingSubmissions ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      opacity: isDeletingSubmissions ? 0.6 : 1
                    }}
                  >
                    {event.registration_enabled ? (
                      <>
                        <FiAlertTriangle />
                        {isDeletingSubmissions ? 'Updating...' : 'Close Registration'}
                      </>
                    ) : (
                      <>
                        <FiUserPlus />
                        {isDeletingSubmissions ? 'Updating...' : 'Open Registration'}
                      </>
                    )}
                  </motion.button>
                  
                  <motion.button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting}
                    whileHover={{ scale: isDeleting ? 1 : 1.02 }}
                    whileTap={{ scale: isDeleting ? 1 : 0.98 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.5rem',
                      background: 'rgba(231, 76, 60, 0.2)',
                      color: '#e74c3c',
                      border: '1px solid rgba(231, 76, 60, 0.3)',
                      borderRadius: '8px',
                      cursor: isDeleting ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      opacity: isDeleting ? 0.6 : 1
                    }}
                  >
                    <FiTrash2 />
                    {isDeleting ? 'Deleting...' : 'Delete Event'}
                  </motion.button>
                </div>
              </div>
            )}

            {/* Event Files Section */}
            <div className="EventDetails__files">
              <div className="EventDetails__filesHeader">
                <h2>Event Files</h2>
                {isBoardOrAdmin && (
                  <button
                    className="EventDetails__uploadBtn"
                    onClick={() => setShowUpload(!showUpload)}
                  >
                    <FiUpload />
                    {showUpload ? 'Cancel' : 'Upload File'}
                  </button>
                )}
              </div>

              {isBoardOrAdmin && showUpload && (
                <div className="EventDetails__uploadSection">
                  <form onSubmit={handleUpload} className="EventDetails__uploadForm">
                    <div className="EventDetails__uploadControls">
                      <label htmlFor="file-input" className="EventDetails__fileInputLabel">
                        <FiUpload />
                        {selectedFile ? selectedFile.name : 'Choose File'}
                      </label>
                      <input
                        id="file-input"
                        ref={fileInputRef}
                        type="file"
                        className="EventDetails__fileInput"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />
                      <select
                        className="EventDetails__fileTypeSelect"
                        value={fileType}
                        onChange={(e) => setFileType(e.target.value)}
                      >
                        <option value="document">Document</option>
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="audio">Audio</option>
                        <option value="other">Other</option>
                      </select>
                      <button
                        type="submit"
                        className="EventDetails__uploadSubmitBtn"
                        disabled={!selectedFile || isUploading}
                      >
                        {isUploading ? 'Uploading...' : 'Upload'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

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
                          <span className="EventDetails__fileName">{file.file_name}</span>
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
                        {isBoardOrAdmin && (
                          <button
                            className="EventDetails__fileDeleteBtn"
                            onClick={() => handleDeleteFile(file.file_id)}
                            title="Delete"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.article>
      </div>

      {/* Delete Event Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className="success-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
            style={{ zIndex: 1000 }}
          >
            <motion.div
              className="success-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ 
                maxWidth: '500px',
                background: 'rgba(20, 25, 40, 0.98)',
                border: '1px solid rgba(231, 76, 60, 0.3)'
              }}
            >
              <div style={{ 
                fontSize: '3rem', 
                color: '#e74c3c', 
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <FiAlertTriangle />
              </div>
              <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Delete Event?</h2>
              <p style={{ color: '#8EC2F0', marginBottom: '2rem', lineHeight: '1.6' }}>
                Are you sure you want to delete "{event.name}"? This action cannot be undone and will also remove all associated attendance requests.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEvent}
                  disabled={isDeleting}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#e74c3c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    opacity: isDeleting ? 0.6 : 1
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Event'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Submissions Confirmation Modal */}
      <AnimatePresence>
        {showDeleteSubmissionsConfirm && (
          <motion.div
            className="success-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isDeletingSubmissions && setShowDeleteSubmissionsConfirm(false)}
            style={{ zIndex: 1000 }}
          >
            <motion.div
              className="success-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ 
                maxWidth: '500px',
                background: 'rgba(20, 25, 40, 0.98)',
                border: '1px solid rgba(255, 193, 7, 0.3)'
              }}
            >
              <div style={{ 
                fontSize: '3rem', 
                color: '#ffc107', 
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <FiAlertTriangle />
              </div>
              <h2 style={{ color: '#fff', marginBottom: '1rem' }}>
                {event.registration_enabled ? 'Close Registration?' : 'Open Registration?'}
              </h2>
              <p style={{ color: '#8EC2F0', marginBottom: '2rem', lineHeight: '1.6' }}>
                {event.registration_enabled 
                  ? `Are you sure you want to close registration for "${event.name}"? Users will no longer be able to submit attendance requests for this event.`
                  : `Are you sure you want to open registration for "${event.name}"? Users will be able to submit attendance requests for this event.`}
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowDeleteSubmissionsConfirm(false)}
                  disabled={isDeletingSubmissions}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    cursor: isDeletingSubmissions ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleToggleRegistration}
                  disabled={isDeletingSubmissions}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: event.registration_enabled ? '#ffc107' : '#4caf50',
                    color: event.registration_enabled ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isDeletingSubmissions ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    opacity: isDeletingSubmissions ? 0.6 : 1
                  }}
                >
                  {isDeletingSubmissions 
                    ? 'Updating...' 
                    : event.registration_enabled 
                      ? 'Close Registration' 
                      : 'Open Registration'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default EventDetails;
