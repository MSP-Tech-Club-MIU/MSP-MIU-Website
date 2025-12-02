import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import './PageBase.css';
import './CreateEvent.css';
import { FiCalendar, FiMapPin, FiImage, FiFile, FiUpload, FiX } from 'react-icons/fi';

// Import default event image (same as Events.jsx)
import mspLogo from '../assets/Images/msp-logo.png';

const CreateEvent = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    description: '',
    event_date: '',
    location: '',
    category: 'Workshop',
    main_image: '',
    upload_file: '',
    registration_enabled: true
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check user role and authentication
  useEffect(() => {
    const checkUserRole = async () => {
      setLoading(true);
      if (ApiService.isAuthenticated()) {
        try {
          const user = await ApiService.getProfile();
          setUserRole(user.role);
          // Don't redirect - let the component show access denied message
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    };
    checkUserRole();
  }, []);

  const onChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  }, []);

  const validate = useCallback(() => {
    const newErrors = {};
    
    if (!form.name.trim()) {
      newErrors.name = 'Event name is required';
    }
    
    if (!form.event_date) {
      newErrors.event_date = 'Event date is required';
    } else {
      const eventDate = new Date(form.event_date);
      if (isNaN(eventDate.getTime())) {
        newErrors.event_date = 'Invalid date format';
      }
    }
    
    if (!form.location.trim()) {
      newErrors.location = 'Location is required';
    }
    
    if (!form.category) {
      newErrors.category = 'Category is required';
    } else if (!['Session', 'Workshop', 'Entertainment'].includes(form.category)) {
      newErrors.category = 'Invalid category';
    }
    
    return newErrors;
  }, [form]);

  const onSubmit = useCallback(async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    
    setSubmitting(true);
    try {
      // Prepare form data
      // If main_image is empty, set to null so the display logic can use the default placeholder
      const eventData = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        event_date: form.event_date,
        location: form.location.trim(),
        category: form.category,
        main_image: form.main_image.trim() ? form.main_image.trim() : null,
        upload_file: form.upload_file.trim() || null,
        registration_enabled: form.registration_enabled
      };

      await ApiService.createEvent(eventData);
      setShowSuccess(true);
      setTimeout(() => navigate('/events'), 2000);
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to create event. Please try again.' });
      setSubmitting(false);
    }
  }, [form, navigate, validate]);

  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, main_image: 'Please select an image file' }));
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, main_image: 'Image size must be less than 10MB' }));
      return;
    }

    setUploadingImage(true);
    setErrors(prev => ({ ...prev, main_image: '' }));

    try {
      const result = await ApiService.uploadFile(file, 'events');
      setForm(prev => ({ ...prev, main_image: result.url }));
    } catch (error) {
      console.error('Image upload error:', error);
      setErrors(prev => ({ ...prev, main_image: error.message || 'Failed to upload image' }));
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  }, []);

  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, upload_file: 'File size must be less than 50MB' }));
      return;
    }

    setUploadingFile(true);
    setErrors(prev => ({ ...prev, upload_file: '' }));

    try {
      // Upload to slides directory
      const result = await ApiService.uploadFile(file, 'slides');
      setForm(prev => ({ ...prev, upload_file: result.url }));
    } catch (error) {
      console.error('File upload error:', error);
      setErrors(prev => ({ ...prev, upload_file: error.message || 'Failed to upload file' }));
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  // Show loading while checking authentication
  if (loading) {
    return (
      <section className="PageBase">
        <div className="container">
          <PageLoader message="Loading..." />
        </div>
      </section>
    );
  }

  // Show unauthorized if not authenticated or not board/admin
  if (!loading && (userRole === null || (userRole !== 'board' && userRole !== 'admin'))) {
    const isNotAuthenticated = userRole === null;
    return (
      <section className="PageBase">
        <div className="container">
          <motion.div
            className="neo-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <h1 className="card-title">Access Denied</h1>
            <p style={{ color: '#e74c3c', marginBottom: '1rem', textAlign: 'center' }}>
              {isNotAuthenticated 
                ? 'You must be logged in and have board or administrator privileges to access this page.'
                : 'This page is only available to board members and administrators.'}
            </p>
            <div className="actions" style={{ justifyContent: 'center' }}>
              {isNotAuthenticated ? (
                <motion.button
                  className="btn primary"
                  onClick={() => navigate('/login')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Go to Login
                </motion.button>
              ) : (
                <motion.button
                  className="btn primary"
                  onClick={() => navigate('/events')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Back to Events
                </motion.button>
              )}
              <motion.button
                className="btn secondary"
                onClick={() => navigate('/')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Go Home
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="PageBase">
      <BackButton to="/events" label="Back to Events" />
      <div className="container">
        <motion.div
          className="neo-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
              <h1 className="card-title">Create New Event</h1>
              <p className="card-sub">
                Add a new event to the MSP Tech Club calendar
              </p>
          </div>

          <form className="attendance-form" onSubmit={onSubmit}>
            {/* Required Fields */}
            <div className="grid">
              <label className="col-span-2 floating-input">
                Event Name *
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  placeholder="e.g., Opening Ceremony"
                  className={`pill ${errors.name ? 'error-border' : ''}`}
                  disabled={submitting}
                  required
                />
                {errors.name && <span className="error">{errors.name}</span>}
              </label>

              <label className="floating-input">
                Event Date *
                <input
                  type="date"
                  name="event_date"
                  value={form.event_date}
                  onChange={onChange}
                  className={`pill ${errors.event_date ? 'error-border' : ''}`}
                  disabled={submitting}
                  required
                />
                {errors.event_date && <span className="error">{errors.event_date}</span>}
              </label>

              <label className="floating-input">
                Location *
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FiMapPin style={{ color: '#8EC2F0' }} />
                  <input
                    type="text"
                    name="location"
                    value={form.location}
                    onChange={onChange}
                    placeholder="e.g., Main Building, Room OOA"
                    className={`pill ${errors.location ? 'error-border' : ''}`}
                    disabled={submitting}
                    required
                  />
                </div>
                {errors.location && <span className="error">{errors.location}</span>}
              </label>

              <label className="floating-input">
                Category *
                <select
                  name="category"
                  value={form.category}
                  onChange={onChange}
                  className={`pill ${errors.category ? 'error-border' : ''}`}
                  disabled={submitting}
                  required
                >
                  <option value="Workshop">Workshop</option>
                  <option value="Session">Session</option>
                  <option value="Entertainment">Entertainment</option>
                </select>
                {errors.category && <span className="error">{errors.category}</span>}
              </label>
            </div>

            {/* Description */}
            <label className="floating-input" style={{ marginTop: '1rem' }}>
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={onChange}
                placeholder="Describe the event, what attendees can expect, agenda, etc."
                className="pill"
                rows="5"
                disabled={submitting}
                style={{ resize: 'vertical', minHeight: '100px' }}
              />
            </label>

            {/* Registration Toggle */}
            <div className="create-event-registration-toggle">
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="registration_enabled"
                  checked={form.registration_enabled}
                  onChange={onChange}
                  disabled={submitting}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ color: '#8EC2F0', fontSize: '0.95rem' }}>
                  Allow registration for this event
                </span>
              </label>
              <small style={{ color: '#8EC2F0', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block', marginLeft: '2rem' }}>
                If unchecked, users will not be able to submit attendance requests for this event
              </small>
            </div>

            {/* Optional Fields */}
            <div className="grid" style={{ marginTop: '1rem' }}>
              <label className="floating-input">
                Main Image
                <div className="create-event-upload-section">
                  <div>
                    <FiImage style={{ color: '#8EC2F0' }} />
                    <input
                      type="url"
                      name="main_image"
                      value={form.main_image}
                      onChange={onChange}
                      placeholder="https://example.com/image.jpg or upload a file"
                      className="pill"
                      disabled={submitting || uploadingImage}
                    />
                  </div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    disabled={submitting || uploadingImage}
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={submitting || uploadingImage}
                    className="btn secondary"
                  >
                    <FiUpload />
                    {uploadingImage ? 'Uploading...' : 'Upload'}
                  </button>
                  {form.main_image && (
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, main_image: '' }))}
                      disabled={submitting || uploadingImage}
                      className="btn secondary"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        padding: '0.5rem 1rem'
                      }}
                    >
                      <FiX />
                    </button>
                  )}
                </div>
                <small style={{ color: '#8EC2F0', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  Optional: URL to the event's main image or upload an image file. If not provided, the default logo will be used as a placeholder.
                </small>
                {errors.main_image && <span className="error" style={{ marginTop: '0.25rem', display: 'block' }}>{errors.main_image}</span>}
                {!form.main_image && (
                  <div className="create-event-placeholder-preview">
                    <div>
                      <img 
                        src={mspLogo} 
                        alt="MSP Logo - Default event placeholder"
                      />
                      <div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#8EC2F0', fontWeight: '500' }}>
                          Default Placeholder Image
                        </p>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'rgba(142, 194, 240, 0.7)' }}>
                          This image will be used if no image URL is provided
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </label>

              <label className="floating-input">
                Upload File
                <div className="create-event-upload-section">
                  <div>
                    <FiFile style={{ color: '#8EC2F0' }} />
                    <input
                      type="url"
                      name="upload_file"
                      value={form.upload_file}
                      onChange={onChange}
                      placeholder="https://example.com/file.pdf or upload a file"
                      className="pill"
                      disabled={submitting || uploadingFile}
                    />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    disabled={submitting || uploadingFile}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting || uploadingFile}
                    className="btn secondary"
                  >
                    <FiUpload />
                    {uploadingFile ? 'Uploading...' : 'Upload'}
                  </button>
                  {form.upload_file && (
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, upload_file: '' }))}
                      disabled={submitting || uploadingFile}
                      className="btn secondary"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        padding: '0.5rem 1rem'
                      }}
                    >
                      <FiX />
                    </button>
                  )}
                </div>
                <small style={{ color: '#8EC2F0', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  Optional: URL to event-related files (PDFs, documents, etc.) or upload a file directly.
                </small>
                {errors.upload_file && <span className="error" style={{ marginTop: '0.25rem', display: 'block' }}>{errors.upload_file}</span>}
              </label>
            </div>

            {errors.submit && (
              <div className="error-message" style={{ marginTop: '1rem', color: 'var(--error-color, #e74c3c)' }}>
                {errors.submit}
              </div>
            )}

            <div className="actions" style={{ marginTop: '2rem' }}>
              <motion.button
                type="submit"
                className="btn primary"
                disabled={submitting}
                whileHover={{ scale: submitting ? 1 : 1.02 }}
                whileTap={{ scale: submitting ? 1 : 0.98 }}
              >
                {submitting ? (
                  <span className="loading-inline">
                    <span className="dots-loader" aria-hidden="true">
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                    Creating Event…
                  </span>
                ) : (
                  <>
                    <FiCalendar style={{ marginRight: '0.5rem' }} />
                    Create Event
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="success-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="success-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="success-icon">✓</div>
              <h2>Event Created!</h2>
              <p>Your event has been successfully added to the calendar</p>
              <div className="success-loader">
                <div className="bar" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default CreateEvent;

