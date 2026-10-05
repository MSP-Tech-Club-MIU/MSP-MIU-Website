import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSend,
  FiCheckCircle,
  FiStar,
  FiMessageSquare,
  FiShield,
  FiLock,
  FiCompass,
  FiBookOpen,
  FiCalendar,
  FiAward
} from 'react-icons/fi';
import { MdLightbulb } from 'react-icons/md';
import SEO from '../components/SEO';
import BackButton from '../components/BackButton';
import FeedbackModal from '../components/FeedbackModal';
import SearchableSelect from '../components/SearchableSelect';
import ApiService from '../services/api';
import './PageBase.css';
import './Suggestions.css';

const MAX_LENGTH = 2000;

const ACTIVITY_CATEGORIES = [
  { key: 'general', label: 'General Club', icon: <FiCompass /> },
  { key: 'course', label: 'Course', icon: <FiBookOpen /> },
  { key: 'event', label: 'Event', icon: <FiCalendar /> },
  { key: 'competition', label: 'Competition', icon: <FiAward /> }
];

export default function Suggestions() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('tab') === 'idea' ? 'idea' : 'feedback';

  // Modes: 'feedback' (Activity & Club Review) or 'idea' (Open Suggestions & Ideas)
  const [activeMode, setActiveMode] = useState(initialMode);

  // Activity Feedback state
  const [selectedType, setSelectedType] = useState('general');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedItemTitle, setSelectedItemTitle] = useState('');

  // Suggestion / Idea state
  const [suggestionForm, setSuggestionForm] = useState({
    name: '',
    email: '',
    suggestion: '',
    anonymous: false
  });
  const [suggestionErrors, setSuggestionErrors] = useState({});
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [suggestionSubmitError, setSuggestionSubmitError] = useState('');
  const [showSuggestionSuccess, setShowSuggestionSuccess] = useState(false);

  // Auto-fill logged in user for suggestions
  useEffect(() => {
    if (ApiService.isAuthenticated()) {
      ApiService.getProfile()
        .then((user) => {
          if (user) {
            setSuggestionForm((prev) => ({
              ...prev,
              name: prev.name || user.full_name || user.username || '',
              email: prev.email || user.email || ''
            }));
          }
        })
        .catch(() => {});
    }
  }, []);

  // Fetch paginated, searchable items for courses, events, and competitions
  // Ensures not all records are fetched at once!
  const fetchCategoryOptions = useCallback(
    async (searchQuery, pageNum = 1) => {
      try {
        if (selectedType === 'course') {
          const res = await ApiService.getCourses({
            search: searchQuery || undefined,
            page: pageNum,
            limit: 8,
            season_id: 'all'
          });
          const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
          const total = res?.pagination?.total ?? items.length;
          const hasNext = Boolean(res?.pagination?.hasNext);
          return { items, total, hasNext };
        } else if (selectedType === 'event') {
          const res = await ApiService.getEvents({
            search: searchQuery || undefined,
            page: pageNum,
            limit: 8,
            season_id: 'all',
            no_fallback: true
          });
          const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
          const total = res?.pagination?.total ?? items.length;
          const hasNext = Boolean(res?.pagination?.hasNext);
          return { items, total, hasNext };
        } else if (selectedType === 'competition') {
          const res = await ApiService.getCompetitions({
            search: searchQuery || undefined,
            page: pageNum,
            limit: 8,
            season_id: 'all'
          });
          const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
          const total = res?.pagination?.total ?? items.length;
          const hasNext = Boolean(res?.pagination?.hasNext);
          return { items, total, hasNext };
        }
      } catch (err) {
        console.error(`Failed to fetch ${selectedType} options:`, err);
      }
      return { items: [], total: 0, hasNext: false };
    },
    [selectedType]
  );

  // Subtitle builder for searchable dropdown items
  const getOptionSubtitle = useCallback(
    (item) => {
      if (selectedType === 'course') {
        const status = item.status ? item.status.replace('_', ' ') : 'Course';
        return `Course • ${status.charAt(0).toUpperCase() + status.slice(1)}`;
      }
      if (selectedType === 'event') {
        const dateStr = item.event_date ? new Date(item.event_date).toLocaleDateString() : '';
        return [item.category || 'Event', dateStr].filter(Boolean).join(' • ');
      }
      if (selectedType === 'competition') {
        const typeStr = item.type ? item.type.replace('_', ' ') : 'Competition';
        return `Competition • ${typeStr.charAt(0).toUpperCase() + typeStr.slice(1)}`;
      }
      return null;
    },
    [selectedType]
  );

  // Reset selected item when category changes
  const handleCategoryChange = useCallback((catKey) => {
    setSelectedType(catKey);
    setSelectedItemId('');
    setSelectedItemTitle('');
  }, []);

  // Suggestion input change
  const onSuggestionChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setSuggestionForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setSuggestionErrors((prev) => ({ ...prev, [name]: '' }));
    setSuggestionSubmitError('');
  }, []);

  // Suggestion validation
  const validateSuggestion = useCallback(() => {
    const next = {};
    if (!suggestionForm.suggestion.trim()) {
      next.suggestion = 'Please describe your idea or suggestion';
    } else if (suggestionForm.suggestion.trim().length > MAX_LENGTH) {
      next.suggestion = `Keep it under ${MAX_LENGTH} characters`;
    }
    if (!suggestionForm.anonymous && !suggestionForm.name.trim()) {
      next.name = 'Name is required unless you submit anonymously';
    }
    if (suggestionForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(suggestionForm.email.trim())) {
      next.email = 'Enter a valid email address';
    }
    return next;
  }, [suggestionForm]);

  // Suggestion submission
  const onSuggestionSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const v = validateSuggestion();
      if (Object.keys(v).length) {
        setSuggestionErrors(v);
        return;
      }

      setSubmittingSuggestion(true);
      setSuggestionSubmitError('');
      try {
        await ApiService.submitSuggestion({
          suggestion: suggestionForm.suggestion.trim(),
          anonymous: suggestionForm.anonymous,
          name: suggestionForm.anonymous ? undefined : suggestionForm.name.trim(),
          email: suggestionForm.anonymous ? undefined : suggestionForm.email.trim() || undefined
        });
        setShowSuggestionSuccess(true);
        setSuggestionForm((prev) => ({ ...prev, suggestion: '' }));
        setSuggestionErrors({});
      } catch (err) {
        setSuggestionSubmitError(err.message || 'Failed to submit idea. Please try again.');
      } finally {
        setSubmittingSuggestion(false);
      }
    },
    [suggestionForm, validateSuggestion]
  );

  return (
    <section className="PageBase SuggestionsPage">
      <SEO
        title="Suggestions / Feedback"
        description="Share your feedback, ratings, and ideas with the MSP Tech Club at MIU. Every single submission is carefully reviewed by our board to improve club activities."
        url="/suggestions"
      />
      <BackButton to="/" label="Back to Home" />

      <div className="container">
        {/* Header */}
        <div className="SuggestionsPage__header">
          <h1 className="SuggestionsPage__title">Suggestions / Feedback</h1>
          <p className="SuggestionsPage__subtitle">
            Help shape MSP MIU. Review past courses and events, give club feedback, or propose fresh ideas for future initiatives.
          </p>
        </div>

        {/* Reassurance & Commitment Card */}
        <motion.div
          className="SuggestionsPage__commitmentBanner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="SuggestionsPage__commitmentHeader">
            <FiShield className="SuggestionsPage__commitmentIcon" />
            <h2 className="SuggestionsPage__commitmentTitle">
              Your Voice Truly Matters — 100% Carefully Reviewed
            </h2>
          </div>
          <p className="SuggestionsPage__commitmentText">
            We believe that our club grows and succeeds because of our students. <strong>Each and every piece of feedback and suggestion submitted is reviewed carefully by the board and club leadership.</strong> Whether it's praise for what worked well, constructive critique on areas we can improve, or a fresh proposal for a future workshop, your input directly guides our decisions.
          </p>
          <div className="SuggestionsPage__commitmentPills">
            <span className="SuggestionsPage__commitmentPill">
              <FiCheckCircle style={{ color: '#00e5ff' }} /> Reviewed by Leadership
            </span>
            <span className="SuggestionsPage__commitmentPill">
              <FiLock style={{ color: '#81d4fa' }} /> Anonymous Option Available
            </span>
            <span className="SuggestionsPage__commitmentPill">
              <FiStar style={{ color: '#ffc107' }} /> Drives Real Club Improvements
            </span>
          </div>
        </motion.div>

        {/* Dual Mode Switcher Tabs */}
        <div className="SuggestionsPage__modeTabs">
          <button
            type="button"
            className={`SuggestionsPage__modeTab ${activeMode === 'feedback' ? 'SuggestionsPage__modeTab--active' : ''}`}
            onClick={() => setActiveMode('feedback')}
          >
            <FiStar /> Activity &amp; Club Feedback
          </button>
          <button
            type="button"
            className={`SuggestionsPage__modeTab ${activeMode === 'idea' ? 'SuggestionsPage__modeTab--active' : ''}`}
            onClick={() => setActiveMode('idea')}
          >
            <MdLightbulb /> Propose an Idea / Suggestion
          </button>
        </div>

        {/* Main Card Content */}
        <div className="SuggestionsPage__card">
          <AnimatePresence mode="wait">
            {activeMode === 'feedback' ? (
              <motion.div
                key="feedback-mode"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                {/* Activity Category Selector */}
                <div className="SuggestionsPage__activityTabs">
                  {ACTIVITY_CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      className={`SuggestionsPage__activityTab ${selectedType === cat.key ? 'SuggestionsPage__activityTab--active' : ''}`}
                      onClick={() => handleCategoryChange(cat.key)}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>

                {/* Specific Item Searchable Picker */}
                {selectedType !== 'general' && (
                  <div className="SuggestionsPage__itemPicker">
                    <SearchableSelect
                      key={selectedType}
                      label={`Select ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} to Review:`}
                      placeholder={`Choose a ${selectedType} or type to search...`}
                      searchPlaceholder={`Search ${selectedType}s by title or keyword...`}
                      typeIcon={
                        selectedType === 'course' ? <FiBookOpen /> :
                        selectedType === 'event' ? <FiCalendar /> :
                        <FiAward />
                      }
                      value={selectedItemId}
                      fetchOptions={fetchCategoryOptions}
                      getOptionLabel={(item) => item?.title || item?.name || ''}
                      getOptionValue={(item) => String(item?.course_id ?? item?.event_id ?? item?.competition_id ?? '')}
                      getOptionSubtitle={getOptionSubtitle}
                      emptyMessage={`No ${selectedType}s match your search.`}
                      onChange={(item) => {
                        if (item) {
                          const id = String(item?.course_id ?? item?.event_id ?? item?.competition_id ?? '');
                          const title = item?.title || item?.name || '';
                          setSelectedItemId(id);
                          setSelectedItemTitle(title);
                        } else {
                          setSelectedItemId('');
                          setSelectedItemTitle('');
                        }
                      }}
                    />
                  </div>
                )}

                {/* Reusable Feedback Form Embedded Inline */}
                <FeedbackModal
                  key={`${selectedType}-${selectedItemId}`}
                  isInline={true}
                  targetType={selectedType}
                  targetId={selectedItemId ? parseInt(selectedItemId, 10) : null}
                  targetTitle={selectedType === 'general' ? 'General Club Experience' : selectedItemTitle}
                />
              </motion.div>
            ) : (
              <motion.div
                key="idea-mode"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <h2 style={{ fontSize: '1.4rem', color: '#fff', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MdLightbulb style={{ color: '#00e5ff' }} /> Propose an Idea or Initiative
                </h2>
                <p style={{ color: '#9cb8d9', fontSize: '0.92rem', margin: '0 0 20px', lineHeight: 1.5 }}>
                  Have an idea for a new workshop, hackathon, tech track, guest speaker, or platform feature? Share it below.
                </p>

                {showSuggestionSuccess ? (
                  <motion.div
                    className="SuggestionsPage__success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <FiCheckCircle className="SuggestionsPage__successIcon" />
                    <h2>Thank You for Your Suggestion!</h2>
                    <p>
                      Your proposal has been submitted. Our team and board read every suggestion carefully during activity planning.
                    </p>
                    <button
                      type="button"
                      className="SuggestionsPage__submit"
                      onClick={() => {
                        setShowSuggestionSuccess(false);
                        setSuggestionSubmitError('');
                      }}
                      style={{ alignSelf: 'center', margin: '0 auto' }}
                    >
                      Submit Another Idea
                    </button>
                  </motion.div>
                ) : (
                  <form className="SuggestionsPage__form" onSubmit={onSuggestionSubmit} noValidate>
                    <label className="SuggestionsPage__anon">
                      <input
                        type="checkbox"
                        name="anonymous"
                        checked={suggestionForm.anonymous}
                        onChange={onSuggestionChange}
                      />
                      <span>Submit anonymously</span>
                    </label>

                    {!suggestionForm.anonymous && (
                      <div className="SuggestionsPage__identity">
                        <div className="SuggestionsPage__inputGroup">
                          <label className="SuggestionsPage__label">
                            Full Name <span style={{ color: '#ff8a80' }}>*</span>
                          </label>
                          <input
                            type="text"
                            name="name"
                            className="SuggestionsPage__input"
                            placeholder="Your full name"
                            value={suggestionForm.name}
                            onChange={onSuggestionChange}
                            maxLength={120}
                          />
                          {suggestionErrors.name && (
                            <span className="SuggestionsPage__fieldError">{suggestionErrors.name}</span>
                          )}
                        </div>

                        <div className="SuggestionsPage__inputGroup">
                          <label className="SuggestionsPage__label">
                            Email Address <span style={{ opacity: 0.6 }}>(Optional)</span>
                          </label>
                          <input
                            type="email"
                            name="email"
                            className="SuggestionsPage__input"
                            placeholder="Your email address"
                            value={suggestionForm.email}
                            onChange={onSuggestionChange}
                            maxLength={255}
                          />
                          {suggestionErrors.email && (
                            <span className="SuggestionsPage__fieldError">{suggestionErrors.email}</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="SuggestionsPage__inputGroup">
                      <label className="SuggestionsPage__label">
                        Your Idea / Suggestion <span style={{ color: '#ff8a80' }}>*</span>
                      </label>
                      <textarea
                        name="suggestion"
                        className="SuggestionsPage__textarea"
                        placeholder="Describe your idea or suggestion in detail..."
                        value={suggestionForm.suggestion}
                        onChange={onSuggestionChange}
                        maxLength={MAX_LENGTH}
                        rows={5}
                      />
                      <div className="SuggestionsPage__meta">
                        {suggestionErrors.suggestion ? (
                          <span className="SuggestionsPage__fieldError">{suggestionErrors.suggestion}</span>
                        ) : (
                          <span style={{ opacity: 0.6 }}>Be as specific as possible</span>
                        )}
                        <span>{suggestionForm.suggestion.length} / {MAX_LENGTH}</span>
                      </div>
                    </div>

                    {suggestionSubmitError && (
                      <div className="SuggestionsPage__errorBanner">
                        {suggestionSubmitError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="SuggestionsPage__submit"
                      disabled={submittingSuggestion}
                    >
                      <FiSend />
                      {submittingSuggestion ? 'Submitting…' : 'Submit Idea'}
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
