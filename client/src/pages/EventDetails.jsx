import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './EventDetails.css';
import { FiCalendar, FiClock, FiMapPin, FiArrowLeft, FiUpload, FiDownload, FiTrash2, FiFile, FiFileText, FiImage, FiVideo, FiMusic, FiUserPlus } from 'react-icons/fi';
import ApiService from '../services/api';

// Import images
import eventImage1 from '../assets/Images/MSP-MIU_Opening_Session.jpg';

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
          // Use main_image from database if available, otherwise fallback to imported image
          image_url: (data.main_image && data.main_image.trim()) ? data.main_image : eventImage1,
          category: data.category
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
          <div className="EventDetailsPage__error">
            <FiCalendar />
            <p>Loading event...</p>
            <span>Please wait while we fetch the event details</span>
          </div>
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

            {/* Register Button */}
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
    </section>
  );
};

export default EventDetails;
