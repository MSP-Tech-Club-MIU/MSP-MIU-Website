import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiStar,
  FiThumbsUp,
  FiTrendingUp,
  FiMessageSquare,
  FiSend,
  FiX,
  FiCheckCircle,
  FiAlertCircle
} from 'react-icons/fi';
import ApiService from '../services/api';
import './FeedbackModal.css';

const RATING_DESCRIPTIONS = {
  1: 'Poor — Needs substantial work',
  2: 'Fair — Room for improvement',
  3: 'Good — Met expectations',
  4: 'Very Good — Highly enjoyable',
  5: 'Excellent — Outstanding experience!'
};

const MAX_LEN = 3000;

export default function FeedbackModal({
  isOpen = true,
  onClose,
  targetType = 'general',
  targetId = null,
  targetTitle = '',
  courseId = null,
  onSuccess,
  isInline = false
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [positives, setPositives] = useState('');
  const [negatives, setNegatives] = useState('');
  const [feedback, setFeedback] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Auto-fill logged-in user info
  useEffect(() => {
    if (ApiService.isAuthenticated()) {
      ApiService.getProfile()
        .then((user) => {
          if (user) {
            setName(user.full_name || user.username || '');
            setEmail(user.email || '');
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleReset = () => {
    setRating(0);
    setHoverRating(0);
    setPositives('');
    setNegatives('');
    setFeedback('');
    setSubmitted(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // At least one piece of feedback must be provided
    if (!rating && !positives.trim() && !negatives.trim() && !feedback.trim()) {
      setError('Please provide a rating or at least one comment before submitting.');
      return;
    }

    if (!anonymous && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await ApiService.submitFeedback({
        target_type: targetType,
        target_id: targetId,
        course_id: courseId,
        rating: rating || null,
        positives: positives.trim() || undefined,
        negatives: negatives.trim() || undefined,
        feedback: feedback.trim() || undefined,
        anonymous,
        name: anonymous ? undefined : name.trim() || undefined,
        email: anonymous ? undefined : email.trim() || undefined
      });

      setSubmitted(true);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen && !isInline) return null;

  const activeRatingDesc = hoverRating || rating;

  const content = (
    <div className={`FeedbackModal__card ${isInline ? 'FeedbackModal__card--inline' : ''}`}>
      {!isInline && onClose && (
        <button
          type="button"
          className="FeedbackModal__close"
          onClick={onClose}
          aria-label="Close feedback modal"
        >
          <FiX />
        </button>
      )}

      {submitted ? (
        <motion.div
          className="FeedbackModal__success"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <FiCheckCircle className="FeedbackModal__successIcon" />
          <h3 className="FeedbackModal__successTitle">Thank You for Your Feedback!</h3>
          <p className="FeedbackModal__successMsg">
            Your review and insights help us track performance and continuously improve MSP MIU activities.
          </p>
          <div className="FeedbackModal__actions" style={{ justifyContent: 'center' }}>
            <button
              type="button"
              className="FeedbackModal__btn FeedbackModal__btn--cancel"
              onClick={handleReset}
            >
              Submit Another
            </button>
            {!isInline && onClose && (
              <button
                type="button"
                className="FeedbackModal__btn FeedbackModal__btn--submit"
                onClick={onClose}
              >
                Close
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="FeedbackModal__badge">
            {targetType === 'general' ? 'Club Feedback' : `${targetType.toUpperCase()} Review`}
          </div>

          <h2 className="FeedbackModal__title">
            <FiMessageSquare style={{ color: '#03a9f4' }} />
            {targetTitle ? `Feedback: ${targetTitle}` : 'Share Your Experience'}
          </h2>

          <p className="FeedbackModal__subtitle">
            Help us track the performance of this activity by pointing out the positives and areas for growth.
          </p>

          {/* Interactive Star Rating */}
          <div className="FeedbackModal__ratingSection">
            <span className="FeedbackModal__ratingLabel">Overall Performance Rating</span>
            <div className="FeedbackModal__stars" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`FeedbackModal__starBtn ${
                    (hoverRating || rating) >= star ? 'FeedbackModal__starBtn--active' : ''
                  }`}
                  onMouseEnter={() => setHoverRating(star)}
                  onClick={() => setRating(rating === star ? 0 : star)}
                  title={`${star} Star${star > 1 ? 's' : ''}`}
                >
                  <FiStar />
                </button>
              ))}
            </div>
            <div className="FeedbackModal__ratingText">
              {activeRatingDesc ? RATING_DESCRIPTIONS[activeRatingDesc] : 'Click a star to rate'}
            </div>
          </div>

          {/* Positives */}
          <div className="FeedbackModal__group">
            <label className="FeedbackModal__label FeedbackModal__label--positives">
              <FiThumbsUp /> What went well? (Positives)
            </label>
            <textarea
              className="FeedbackModal__textarea"
              placeholder="What did you like most? Tutor clarity, engaging topics, organization, highlights..."
              value={positives}
              onChange={(e) => setPositives(e.target.value)}
              maxLength={MAX_LEN}
              rows={3}
            />
            <span className="FeedbackModal__charCount">{positives.length}/{MAX_LEN}</span>
          </div>

          {/* Negatives / Critiques */}
          <div className="FeedbackModal__group">
            <label className="FeedbackModal__label FeedbackModal__label--negatives">
              <FiTrendingUp /> What could be improved? (Constructive Feedback)
            </label>
            <textarea
              className="FeedbackModal__textarea"
              placeholder="What could we do better? Pacing, technical setup, topic depth, suggestions for next time..."
              value={negatives}
              onChange={(e) => setNegatives(e.target.value)}
              maxLength={MAX_LEN}
              rows={3}
            />
            <span className="FeedbackModal__charCount">{negatives.length}/{MAX_LEN}</span>
          </div>

          {/* General comments */}
          <div className="FeedbackModal__group">
            <label className="FeedbackModal__label FeedbackModal__label--general">
              <FiMessageSquare /> Additional Comments or Notes
            </label>
            <textarea
              className="FeedbackModal__textarea"
              placeholder="Any other thoughts, ideas, or recommendations..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              maxLength={MAX_LEN}
              rows={2}
            />
            <span className="FeedbackModal__charCount">{feedback.length}/{MAX_LEN}</span>
          </div>

          {/* Anonymous toggle */}
          <label className="FeedbackModal__checkboxContainer">
            <input
              type="checkbox"
              className="FeedbackModal__checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            <span className="FeedbackModal__checkboxLabel">Submit anonymously</span>
          </label>

          {/* Name & Email fields when not anonymous */}
          {!anonymous && (
            <div className="FeedbackModal__row">
              <div className="FeedbackModal__group">
                <input
                  type="text"
                  className="FeedbackModal__input"
                  placeholder="Your Name (Optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div className="FeedbackModal__group">
                <input
                  type="email"
                  className="FeedbackModal__input"
                  placeholder="Your Email (Optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="FeedbackModal__error">
              <FiAlertCircle style={{ marginRight: 6 }} /> {error}
            </div>
          )}

          <div className="FeedbackModal__actions">
            {!isInline && onClose && (
              <button
                type="button"
                className="FeedbackModal__btn FeedbackModal__btn--cancel"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="FeedbackModal__btn FeedbackModal__btn--submit"
              disabled={loading}
            >
              <FiSend />
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      )}
    </div>
  );

  if (isInline) {
    return content;
  }

  return (
    <AnimatePresence>
      <div className="FeedbackModal__backdrop" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          style={{ width: '100%', maxWidth: '620px' }}
        >
          {content}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
