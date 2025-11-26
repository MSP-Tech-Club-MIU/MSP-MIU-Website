import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import './PageBase.css';
import { FiCalendar, FiMapPin, FiImage, FiFile, FiArrowLeft } from 'react-icons/fi';

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

  // Check user role and authentication
  useEffect(() => {
    const checkUserRole = async () => {
      if (ApiService.isAuthenticated()) {
        try {
          const user = await ApiService.getProfile();
          setUserRole(user.role);
          // Redirect if not board or admin
          if (user.role !== 'board' && user.role !== 'admin') {
            navigate('/events');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          navigate('/events');
        }
      } else {
        navigate('/events');
      }
      setLoading(false);
    };
    checkUserRole();
  }, [navigate]);

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

  // Show unauthorized if not board/admin (shouldn't reach here due to redirect, but just in case)
  if (userRole !== 'board' && userRole !== 'admin') {
    return (
      <section className="PageBase">
        <div className="container">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>You don't have permission to access this page.</p>
            <button onClick={() => navigate('/events')} className="btn primary" style={{ marginTop: '1rem' }}>
              Back to Events
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="PageBase">
      <div className="container">
        <motion.div
          className="neo-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <button
              onClick={() => navigate('/events')}
              className="btn secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <FiArrowLeft />
              Back
            </button>
            <div>
              <h1 className="card-title">Create New Event</h1>
              <p className="card-sub">
                Add a new event to the MSP Tech Club calendar
              </p>
            </div>
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
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
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
                Main Image URL
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FiImage style={{ color: '#8EC2F0' }} />
                  <input
                    type="url"
                    name="main_image"
                    value={form.main_image}
                    onChange={onChange}
                    placeholder="https://example.com/image.jpg"
                    className="pill"
                    disabled={submitting}
                  />
                </div>
                <small style={{ color: '#8EC2F0', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  Optional: URL to the event's main image. If not provided, the default logo will be used as a placeholder.
                </small>
                {!form.main_image && (
                  <div style={{ 
                    marginTop: '0.75rem', 
                    padding: '0.75rem', 
                    background: 'rgba(142, 194, 240, 0.1)', 
                    borderRadius: '8px',
                    border: '1px solid rgba(142, 194, 240, 0.2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <img 
                        src={mspLogo} 
                        alt="MSP Logo - Default event placeholder" 
                        style={{ 
                          width: '60px', 
                          height: '60px', 
                          objectFit: 'cover', 
                          borderRadius: '6px',
                          border: '1px solid rgba(142, 194, 240, 0.3)'
                        }} 
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
                Upload File URL
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FiFile style={{ color: '#8EC2F0' }} />
                  <input
                    type="url"
                    name="upload_file"
                    value={form.upload_file}
                    onChange={onChange}
                    placeholder="https://example.com/file.pdf"
                    className="pill"
                    disabled={submitting}
                  />
                </div>
                <small style={{ color: '#8EC2F0', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  Optional: URL to event-related files (PDFs, documents, etc.)
                </small>
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

