import React, { useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './FeedSection.css';
import ApiService from '../../../services/api';
import Pagination from '../../../components/Pagination';
import SeasonBadge from '../../../components/SeasonBadge';
import { useSeason } from '../../../context/SeasonContext';
import { FiPlus, FiX } from 'react-icons/fi';

const FeedSection = memo(() => {
  const { seasonFilters, isAll, selectedSeasonId } = useSeason();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: '',
    announcement_date: '',
    priority: false,
    send_email: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

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

  const fetchAnnouncements = async (pageNum = page) => {
    try {
      setLoading(true);
      setError(null);
      const result = await ApiService.getAnnouncements({
        page: pageNum,
        limit: 20,
        ...seasonFilters,
      });
      const list = Array.isArray(result) ? result : (result.data || []);
      
      // Map API response to component format
      const mappedAnnouncements = list.map(announcement => ({
        id: announcement.announcement_id,
        title: announcement.title,
        dept: announcement.department,
        date: announcement.announcement_date,
        desc: announcement.description,
        priority: announcement.priority,
        season: announcement.season || null,
        season_id: announcement.season_id ?? null,
      }));
      
      setAnnouncements(mappedAnnouncements);
      setPagination(Array.isArray(result) ? null : (result.pagination || null));
    } catch (err) {
      console.error('Error fetching announcements:', err);
      // If it's a JSON parse error, the API endpoint might not be available
      if (err.message && err.message.includes('JSON')) {
        setError('Announcements API is not available. Please ensure the backend server is running.');
      } else {
        setError(err.message || 'Failed to load announcements');
      }
      setAnnouncements([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, seasonFilters]);

  const isBoardOrAdmin = userRole === 'board' || userRole === 'admin';
  const canCreateAnnouncements = isBoardOrAdmin;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = { ...formData };
      if (typeof selectedSeasonId === 'number') {
        payload.season_id = selectedSeasonId;
      }
      await ApiService.createAnnouncement(payload);
      setShowModal(false);
      setFormData({
        title: '',
        description: '',
        department: '',
        announcement_date: '',
        priority: false,
        send_email: false
      });
      // Refresh announcements list
      setPage(1);
      await fetchAnnouncements(1);
    } catch (err) {
      console.error('Error creating announcement:', err);
      setSubmitError(err.message || 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      title: '',
      description: '',
      department: '',
      announcement_date: '',
      priority: false,
      send_email: false
    });
    setSubmitError(null);
  };

  return (
    <section className="Feed" aria-labelledby="feed-heading">
      <div className="Feed__head">
        <h2 id="feed-heading" className="Feed__title">Announcements & Updates</h2>
        {canCreateAnnouncements && (
          <motion.button
            className="Feed__createBtn"
            onClick={() => setShowModal(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiPlus />
            Create Announcement
          </motion.button>
        )}
      </div>
      <div className="Feed__grid">
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#8EC2F0' }}>
            Loading announcements...
          </div>
        ) : error ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#ffb4b4' }}>
            {error}
          </div>
        ) : announcements.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#8EC2F0' }}>
            No announcements at the moment.
          </div>
        ) : (
          announcements.map(a => (
          <motion.article
            key={a.id}
            className={`FeedCard ${a.priority ? 'is-priority' : ''}`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            whileHover={{ y: -8 }}
          >
            <div className="FeedCard__top">
              <span className="FeedCard__dept" data-dept={a.dept}>{a.dept}</span>
              <time className="FeedCard__date" dateTime={a.date}>{a.date}</time>
            </div>
            <h3 className="FeedCard__title">
              {a.title}
              {isAll && (a.season || a.season_id) && (
                <> {' '}<SeasonBadge season={a.season} /></>
              )}
            </h3>
            <p className="FeedCard__desc">{a.desc}</p>
            {/* <motion.a href="/announcements" className="FeedCard__more" whileHover={{ color: '#fff', x: 3 }}>Read more →</motion.a> */}
          </motion.article>
          ))
        )}
      </div>
      <Pagination pagination={pagination} onPageChange={setPage} />

      {/* Create Announcement Modal — portaled so parent transforms cannot pin it off-screen */}
      {createPortal(
        <AnimatePresence>
          {showModal && (
            <motion.div
              className="Feed__modalOverlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
            >
              <motion.div
                className="Feed__modalContent"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="Feed__modalClose"
                  onClick={handleCloseModal}
                  aria-label="Close modal"
                >
                  <FiX />
                </button>

                <h3 className="Feed__modalTitle">Create New Announcement</h3>

                <form onSubmit={handleSubmit} className="Feed__form">
                  <div className="Feed__formGroup">
                    <label htmlFor="title">Title *</label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter announcement title"
                    />
                  </div>

                  <div className="Feed__formGroup">
                    <label htmlFor="description">Description *</label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows="4"
                      placeholder="Enter announcement description"
                    />
                  </div>

                  <div className="Feed__formGroup">
                    <label htmlFor="department">Department *</label>
                    <input
                      type="text"
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Community, Events, Technical"
                    />
                  </div>

                  <div className="Feed__formGroup">
                    <label htmlFor="announcement_date">Date *</label>
                    <input
                      type="date"
                      id="announcement_date"
                      name="announcement_date"
                      value={formData.announcement_date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="Feed__formGroup Feed__formGroup--checkbox">
                    <label>
                      <input
                        type="checkbox"
                        name="priority"
                        checked={formData.priority}
                        onChange={handleInputChange}
                      />
                      <span>Priority Announcement</span>
                    </label>
                  </div>

                  <div className="Feed__formGroup Feed__formGroup--checkbox">
                    <label>
                      <input
                        type="checkbox"
                        name="send_email"
                        checked={formData.send_email}
                        onChange={handleInputChange}
                      />
                      <span>Send email notification to all members</span>
                    </label>
                  </div>

                  {formData.send_email && (
                    <p className="Feed__formHint" role="note">
                      An email about this announcement will be sent to all members.
                    </p>
                  )}

                  {submitError && (
                    <div className="Feed__formError">{submitError}</div>
                  )}

                  <div className="Feed__formActions">
                    <button
                      type="button"
                      className="Feed__formBtn Feed__formBtn--cancel"
                      onClick={handleCloseModal}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="Feed__formBtn Feed__formBtn--submit"
                      disabled={submitting}
                    >
                      {submitting ? 'Creating...' : 'Create Announcement'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </section>
  );
});

FeedSection.displayName = 'FeedSection';

export default FeedSection;
