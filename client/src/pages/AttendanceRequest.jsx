import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Frontend-only mock submission (replace with real API later)
async function submitAttendanceRequest(data) {
  await new Promise(r => setTimeout(r, 1200));
  console.log('Attendance Request:', data);
  return { success: true };
}

const AttendanceRequest = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    universityId: '',
    needsAttendance: false,
    courseCode: '',
    lectureLabTime: '',
    room: '',
    instructor: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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
      await submitAttendanceRequest(form);
      setShowSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setErrors({ name: 'Submission failed, please try again' });
      setSubmitting(false);
    }
  }, [form, navigate, validate]);

  return (
    <div className="page">
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

              <label className="floating-input">
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
    </div>
  );
};

export default AttendanceRequest;
