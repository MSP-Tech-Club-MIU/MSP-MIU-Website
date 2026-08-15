import React, { useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './FeedSection.css';
import ApiService from '../../../services/api';
import Pagination from '../../../components/Pagination';
import SeasonBadge from '../../../components/SeasonBadge';
import EmailSendProgress from '../../../components/EmailSendProgress';
import { useSeason } from '../../../context/SeasonContext';
import { FiPlus, FiMail, FiX } from 'react-icons/fi';

const WEBSITE_TITLE_MAX = 50;
const WEBSITE_DESC_MAX = 220;
const EMAIL_TITLE_MAX = 120;
const EMAIL_DESC_MAX = 2000;

const emptyForm = () => ({
  title: '',
  description: '',
  department: '',
  announcement_date: '',
  priority: false,
  send_email: false,
  cta_label: '',
  cta_url: ''
});

const FeedSection = memo(() => {
  const { seasonFilters, isAll, selectedSeasonId } = useSeason();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [modalKind, setModalKind] = useState(null); // 'website' | 'email' | null
  const [formData, setFormData] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [emailSendJob, setEmailSendJob] = useState(null);

  const isEmailModal = modalKind === 'email';
  const titleMax = isEmailModal ? EMAIL_TITLE_MAX : WEBSITE_TITLE_MAX;
  const descMax = isEmailModal ? EMAIL_DESC_MAX : WEBSITE_DESC_MAX;
  const showCtaFields = isEmailModal || !!formData.send_email;

  useEffect(() => {
    const checkUserRole = async () => {
      if (ApiService.isAuthenticated()) {
        try {
          const user = await ApiService.getProfile();
          setUserRole(user.role);
        } catch (err) {
          console.error('Error fetching user role:', err);
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

  const openModal = (kind) => {
    setModalKind(kind);
    setFormData(emptyForm());
    setSubmitError(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'title') {
      setFormData(prev => ({ ...prev, title: value.slice(0, titleMax) }));
      return;
    }
    if (name === 'description') {
      setFormData(prev => ({ ...prev, description: value.slice(0, descMax) }));
      return;
    }
    if (name === 'cta_label') {
      setFormData(prev => ({ ...prev, cta_label: value.slice(0, 80) }));
      return;
    }
    if (name === 'cta_url') {
      setFormData(prev => ({ ...prev, cta_url: value.slice(0, 512) }));
      return;
    }
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
      const isEmailBroadcast = modalKind === 'email';
      const payload = {
        title: formData.title,
        description: formData.description,
        department: formData.department,
        announcement_date: formData.announcement_date,
        priority: formData.priority,
        publish_to_website: !isEmailBroadcast,
        send_email: isEmailBroadcast ? true : !!formData.send_email,
        cta_label: showCtaFields ? formData.cta_label : '',
        cta_url: showCtaFields ? formData.cta_url : ''
      };
      if (typeof selectedSeasonId === 'number') {
        payload.season_id = selectedSeasonId;
      }
      const result = await ApiService.createAnnouncement(payload);
      handleCloseModal();
      setPage(1);
      await fetchAnnouncements(1);
      if (result?.emailJob?.id) {
        setEmailSendJob({
          id: result.emailJob.id,
          title: result.data?.title || payload.title
        });
      }
    } catch (err) {
      console.error('Error creating announcement:', err);
      setSubmitError(err.message || 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setModalKind(null);
    setFormData(emptyForm());
    setSubmitError(null);
  };

  return (
    <section className="Feed" aria-labelledby="feed-heading">
      <div className="Feed__head">
        <h2 id="feed-heading" className="Feed__title">Announcements & Updates</h2>
        {canCreateAnnouncements && (
          <div className="Feed__createActions">
            <motion.button
              type="button"
              className="Feed__createBtn Feed__createBtn--secondary"
              onClick={() => openModal('website')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiPlus />
              Website post
            </motion.button>
            <motion.button
              type="button"
              className="Feed__createBtn"
              onClick={() => openModal('email')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiMail />
              Email broadcast
            </motion.button>
          </div>
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
            <p className="FeedCard__desc">
              {a.desc && a.desc.length > 280 ? `${a.desc.slice(0, 279)}…` : a.desc}
            </p>
          </motion.article>
          ))
        )}
      </div>
      <Pagination pagination={pagination} onPageChange={setPage} />

      {emailSendJob && (
        <EmailSendProgress
          jobId={emailSendJob.id}
          title={emailSendJob.title}
          onClear={() => setEmailSendJob(null)}
        />
      )}

      {createPortal(
        <AnimatePresence>
          {modalKind && (
            <motion.div
              className="Feed__modalOverlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
            >
              <motion.div
                className={`Feed__modalContent${isEmailModal ? ' Feed__modalContent--large' : ''}`}
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

                <h3 className="Feed__modalTitle">
                  {isEmailModal ? 'Email broadcast' : 'Website announcement'}
                </h3>
                <p className="Feed__formHint" role="note">
                  {isEmailModal
                    ? 'Mail only — sent to all members. Will not appear on the website feed. CTA button is required.'
                    : 'Short copy for the website feed. Optionally email members (off by default).'}
                </p>

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
                      maxLength={titleMax}
                      placeholder={isEmailModal ? 'Email subject / title' : 'Short title'}
                    />
                    <span className={`Feed__charCount${formData.title.length >= titleMax ? ' is-max' : ''}`}>
                      {formData.title.length}/{titleMax}
                    </span>
                  </div>

                  <div className="Feed__formGroup">
                    <label htmlFor="description">{isEmailModal ? 'Email body *' : 'Description *'}</label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={isEmailModal ? 10 : 4}
                      maxLength={descMax}
                      placeholder={isEmailModal ? 'Full email message…' : 'Brief description for the feed'}
                    />
                    <span className={`Feed__charCount${formData.description.length >= descMax ? ' is-max' : ''}`}>
                      {formData.description.length}/{descMax}
                    </span>
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

                  {!isEmailModal && (
                    <div className="Feed__formGroup Feed__formGroup--checkbox">
                      <label>
                        <input
                          type="checkbox"
                          name="send_email"
                          checked={formData.send_email}
                          onChange={handleInputChange}
                        />
                        <span>Send email to members</span>
                      </label>
                    </div>
                  )}

                  {showCtaFields && (
                    <>
                      <div className="Feed__formGroup">
                        <label htmlFor="cta_label">
                          CTA button {isEmailModal ? '*' : '(optional)'}
                        </label>
                        <input
                          type="text"
                          id="cta_label"
                          name="cta_label"
                          value={formData.cta_label}
                          onChange={handleInputChange}
                          required={isEmailModal}
                          maxLength={80}
                          placeholder="Button label, e.g. Register now"
                        />
                      </div>
                      <div className="Feed__formGroup">
                        <label htmlFor="cta_url">
                          CTA button URL {isEmailModal ? '*' : '(optional)'}
                        </label>
                        <input
                          type="url"
                          id="cta_url"
                          name="cta_url"
                          value={formData.cta_url}
                          onChange={handleInputChange}
                          required={isEmailModal}
                          maxLength={512}
                          placeholder="https://…"
                        />
                      </div>
                    </>
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
                      {submitting
                        ? (isEmailModal ? 'Sending...' : 'Posting...')
                        : (isEmailModal ? 'Send email' : 'Post to website')}
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
