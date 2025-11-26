import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import './PageBase.css';

const AttendanceRequest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    eventId: '',
    name: '',
    phone: '',
    universityId: '',
    needsAttendance: false,
    courseCode: '',
    lectureLabTime: '',
    room: '',
    instructor: '',
    needsSecondAttendance: false,
    secondCourseCode: '',
    secondLectureLabTime: '',
    secondRoom: '',
    secondInstructor: ''
  });
  const [eventName, setEventName] = useState('');
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load event_id from URL params on component mount
  useEffect(() => {
    const eventId = searchParams.get('event_id');
    if (eventId) {
      setForm(prev => ({ ...prev, eventId }));
      // Optionally fetch event name to display
      fetchEventName(eventId);
    } else {
      setLoadingEvent(false);
      setErrors({ eventId: 'Event ID is required. Please register from an event page.' });
    }
  }, [searchParams]);

  // Fetch event name from API
  const fetchEventName = async (eventId) => {
    try {
      setLoadingEvent(true);
      const eventData = await ApiService.getEventById(parseInt(eventId));
      // API service returns the event object directly (already extracted from result.data)
      setEventName(eventData.name || '');
    } catch (error) {
      console.error('Error fetching event:', error);
      // Keep eventName empty so it falls back to showing ID
      setEventName('');
    } finally {
      setLoadingEvent(false);
    }
  };

  const onChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    // Prevent leading zero in phone field
    if (name === 'phone' && type !== 'checkbox') {
      // Remove leading zero if user tries to enter it
      const phoneValue = value.startsWith('0') ? value.substring(1) : value;
      setForm(prev => ({ 
        ...prev, 
        [name]: phoneValue
      }));
    } else {
      setForm(prev => ({ 
        ...prev, 
        [name]: type === 'checkbox' ? checked : value 
      }));
    }
    setErrors(prev => ({ ...prev, [name]: '' }));
  }, []);

  const validate = useCallback(() => {
    const newErrors = {};
    if (!form.eventId) newErrors.eventId = 'Event ID is required. Please register from an event page.';
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!/^\d{10,11}$/.test(form.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Enter valid phone (10-11 digits)';
    }
    if (!form.universityId.trim()) newErrors.universityId = 'University ID is required';
    else if (!/^\d{4}\/\d{5}$/.test(form.universityId)) {
      newErrors.universityId = 'Format: xxxx/xxxxx';
    }
    
    if (form.needsAttendance) {
      if (!form.courseCode.trim()) newErrors.courseCode = 'Course code required';
      if (!form.lectureLabTime.trim()) newErrors.lectureLabTime = 'Time required';
      if (!form.room.trim()) newErrors.room = 'Room required';
      if (!form.instructor.trim()) newErrors.instructor = 'Instructor name required';
    }
    
    if (form.needsSecondAttendance) {
      if (!form.secondCourseCode.trim()) newErrors.secondCourseCode = 'Course code required';
      if (!form.secondLectureLabTime.trim()) newErrors.secondLectureLabTime = 'Time required';
      if (!form.secondRoom.trim()) newErrors.secondRoom = 'Room required';
      if (!form.secondInstructor.trim()) newErrors.secondInstructor = 'Instructor name required';
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
      // Transform form data to match database schema
      // Note: Server-side validation will check if registration is enabled
      const formData = {
        event_id: parseInt(form.eventId),
        full_name: form.name.trim(),
        phone_number: `+20${form.phone.replace(/\s/g, '')}`,
        university_id: form.universityId.trim(),
        course_code: form.needsAttendance ? form.courseCode.trim() : null,
        lecture_lab_time: form.needsAttendance ? form.lectureLabTime.trim() : null,
        room: form.needsAttendance ? form.room.trim() : null,
        instructor_name: form.needsAttendance ? form.instructor.trim() : null,
        additional_course_code: form.needsSecondAttendance ? form.secondCourseCode.trim() : null,
        additional_lecture_lab_time: form.needsSecondAttendance ? form.secondLectureLabTime.trim() : null,
        additional_room: form.needsSecondAttendance ? form.secondRoom.trim() : null,
        additional_instructor_name: form.needsSecondAttendance ? form.secondInstructor.trim() : null
      };

      await ApiService.submitAttendanceRequest(formData);
      setShowSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setErrors({ submit: err.message || 'Submission failed, please try again' });
      setSubmitting(false);
    }
  }, [form, navigate, validate]);

  // Show loading while fetching event
  if (loadingEvent && !form.eventId) {
    return (
      <section className="PageBase">
        <div className="container">
          <PageLoader message="Loading event information..." />
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
          <h1 className="card-title">Attendance Request</h1>
          <p className="card-sub">
            If a club event conflicts with your lecture/lab, submit this form to request proof of attendance
          </p>

          <form className="attendance-form" onSubmit={onSubmit}>
            {/* Event Info Display */}
            {form.eventId && (
              <div className="event-info-display" style={{ 
                marginBottom: '1.5rem', 
                padding: '1rem', 
                background: 'rgba(255, 255, 255, 0.05)', 
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                {loadingEvent ? (
                  <p style={{ margin: 0, color: '#8EC2F0', fontSize: '0.9rem' }}>
                    <strong>Event:</strong> Loading...
                  </p>
                ) : (
                  <p style={{ margin: 0, color: '#8EC2F0', fontSize: '0.9rem' }}>
                    <strong>Event:</strong> {eventName ? eventName : `Event ID: ${form.eventId}`}
                  </p>
                )}
              </div>
            )}

            {errors.eventId && (
              <div className="error-message" style={{ marginBottom: '1rem', color: 'var(--error-color, #e74c3c)' }}>
                {errors.eventId}
              </div>
            )}

            {/* Required Fields */}
            <div className="grid">
              <label className="col-span-2 floating-input">
                Name
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  placeholder="Your full name"
                  className={`pill ${errors.name ? 'error-border' : ''}`}
                  disabled={submitting}
                />
                {errors.name && <span className="error">{errors.name}</span>}
              </label>

              <label className="floating-input phone-full-width">
                Phone Number
                <div className="prefix-wrap">
                  <span className="prefix">+20</span>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={onChange}
                    placeholder="1012345678"
                    className={`pill phone-input ${errors.phone ? 'error-border' : ''}`}
                    disabled={submitting}
                  />
                </div>
                {errors.phone && <span className="error">{errors.phone}</span>}
              </label>

              <label className="floating-input">
                University ID
                <input
                  type="text"
                  name="universityId"
                  value={form.universityId}
                  onChange={onChange}
                  placeholder="20xx/12345"
                  className={`pill ${errors.universityId ? 'error-border' : ''}`}
                  disabled={submitting}
                />
                {errors.universityId && <span className="error">{errors.universityId}</span>}
              </label>
            </div>

            {/* Attendance Checkbox */}
            <div className="attendance-toggle">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="needsAttendance"
                  checked={form.needsAttendance}
                  onChange={onChange}
                  disabled={submitting}
                  className="attendance-checkbox"
                />
                <span>I need attendance proof for a missed lecture/lab</span>
              </label>
            </div>

            {/* Conditional Attendance Fields */}
            <AnimatePresence>
              {form.needsAttendance && (
                <motion.div
                  className="grid attendance-fields"
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ 
                    duration: 0.4,
                    ease: [0.4, 0, 0.2, 1],
                    height: { duration: 0.35 }
                  }}
                >
                  <label className="floating-input">
                    Course Code
                    <input
                      type="text"
                      name="courseCode"
                      value={form.courseCode}
                      onChange={onChange}
                      placeholder="e.g., CS101"
                      className={`pill ${errors.courseCode ? 'error-border' : ''}`}
                      disabled={submitting}
                    />
                    {errors.courseCode && <span className="error">{errors.courseCode}</span>}
                  </label>

                  <label className="floating-input">
                    Lecture/Lab Time
                    <input
                      type="text"
                      name="lectureLabTime"
                      value={form.lectureLabTime}
                      onChange={onChange}
                      placeholder="e.g., 10:00 AM - 12:00 PM"
                      className={`pill ${errors.lectureLabTime ? 'error-border' : ''}`}
                      disabled={submitting}
                    />
                    {errors.lectureLabTime && <span className="error">{errors.lectureLabTime}</span>}
                  </label>

                  <label className="floating-input">
                    Room
                    <input
                      type="text"
                      name="room"
                      value={form.room}
                      onChange={onChange}
                      placeholder="e.g., 321"
                      className={`pill ${errors.room ? 'error-border' : ''}`}
                      disabled={submitting}
                    />
                    {errors.room && <span className="error">{errors.room}</span>}
                  </label>

                  <label className="floating-input">
                    Doctor's or TA's Name
                    <input
                      type="text"
                      name="instructor"
                      value={form.instructor}
                      onChange={onChange}
                      placeholder="Instructor name"
                      className={`pill ${errors.instructor ? 'error-border' : ''}`}
                      disabled={submitting}
                    />
                    {errors.instructor && <span className="error">{errors.instructor}</span>}
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Second Attendance Checkbox - Only show if first attendance is needed */}
            {form.needsAttendance && (
              <div className="attendance-toggle">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="needsSecondAttendance"
                    checked={form.needsSecondAttendance}
                    onChange={onChange}
                    disabled={submitting}
                    className="attendance-checkbox"
                  />
                  <span>I need attendance proof for a second missed lecture/lab</span>
                </label>
              </div>
            )}

            {/* Second Conditional Attendance Fields */}
            <AnimatePresence>
              {form.needsSecondAttendance && (
                <motion.div
                  className="grid attendance-fields"
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ 
                    duration: 0.4,
                    ease: [0.4, 0, 0.2, 1],
                    height: { duration: 0.35 }
                  }}
                >
                  <label className="floating-input">
                    Second Course Code
                    <input
                      type="text"
                      name="secondCourseCode"
                      value={form.secondCourseCode}
                      onChange={onChange}
                      placeholder="e.g., CS102"
                      className={`pill ${errors.secondCourseCode ? 'error-border' : ''}`}
                      disabled={submitting}
                    />
                    {errors.secondCourseCode && <span className="error">{errors.secondCourseCode}</span>}
                  </label>

                  <label className="floating-input">
                    Second Lecture/Lab Time
                    <input
                      type="text"
                      name="secondLectureLabTime"
                      value={form.secondLectureLabTime}
                      onChange={onChange}
                      placeholder="e.g., 2:00 PM - 4:00 PM"
                      className={`pill ${errors.secondLectureLabTime ? 'error-border' : ''}`}
                      disabled={submitting}
                    />
                    {errors.secondLectureLabTime && <span className="error">{errors.secondLectureLabTime}</span>}
                  </label>

                  <label className="floating-input">
                    Second Room
                    <input
                      type="text"
                      name="secondRoom"
                      value={form.secondRoom}
                      onChange={onChange}
                      placeholder="e.g., 322"
                      className={`pill ${errors.secondRoom ? 'error-border' : ''}`}
                      disabled={submitting}
                    />
                    {errors.secondRoom && <span className="error">{errors.secondRoom}</span>}
                  </label>

                  <label className="floating-input">
                    Second Doctor's or TA's Name
                    <input
                      type="text"
                      name="secondInstructor"
                      value={form.secondInstructor}
                      onChange={onChange}
                      placeholder="Instructor name"
                      className={`pill ${errors.secondInstructor ? 'error-border' : ''}`}
                      disabled={submitting}
                    />
                    {errors.secondInstructor && <span className="error">{errors.secondInstructor}</span>}
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            {errors.submit && (
              <div className="error-message" style={{ marginBottom: '1rem', color: 'var(--error-color, #e74c3c)' }}>
                {errors.submit}
              </div>
            )}

            <div className="actions">
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
                    Submitting…
                  </span>
                ) : (
                  'Submit Request'
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
              <h2>Request Submitted!</h2>
              <p>Your attendance request has been received</p>
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

export default AttendanceRequest;
