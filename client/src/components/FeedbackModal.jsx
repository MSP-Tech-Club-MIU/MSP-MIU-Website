import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiStar,
  FiThumbsUp,
  FiTrendingUp,
  FiMessageSquare,
  FiSend,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowRight,
  FiArrowLeft,
  FiCheck
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

const stepVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 30 : -30,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction) => ({
    x: direction > 0 ? -30 : 30,
    opacity: 0
  })
};

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
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

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
    setStep(1);
    setDirection(1);
  };

  const goToStep = (targetStep) => {
    setError('');
    setDirection(targetStep > step ? 1 : -1);
    setStep(targetStep);
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
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
  const isStep1Complete = rating > 0 || positives.trim().length > 0 || negatives.trim().length > 0;

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
        <div className="FeedbackModal__inner">
          <div className="FeedbackModal__header">
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

            {/* Stepper Navigation */}
            <div className="FeedbackModal__stepper">
              <button
                type="button"
                className={`FeedbackModal__stepItem ${step === 1 ? 'FeedbackModal__stepItem--active' : ''} ${
                  isStep1Complete ? 'FeedbackModal__stepItem--complete' : ''
                }`}
                onClick={() => goToStep(1)}
              >
                <span className="FeedbackModal__stepNumber">
                  {isStep1Complete && step !== 1 ? <FiCheck /> : '1'}
                </span>
                <span className="FeedbackModal__stepLabel">Rating & Highlights</span>
              </button>

              <div className={`FeedbackModal__stepDivider ${step === 2 || isStep1Complete ? 'FeedbackModal__stepDivider--active' : ''}`} />

              <button
                type="button"
                className={`FeedbackModal__stepItem ${step === 2 ? 'FeedbackModal__stepItem--active' : ''}`}
                onClick={() => goToStep(2)}
              >
                <span className="FeedbackModal__stepNumber">2</span>
                <span className="FeedbackModal__stepLabel">Notes & Identity</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="FeedbackModal__form">
            <div className="FeedbackModal__body">
              <AnimatePresence mode="wait" custom={direction}>
                {step === 1 ? (
                  <motion.div
                    key="step-1"
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="FeedbackModal__stepContent"
                  >
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
                            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
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
                      <label htmlFor="feedback-positives" className="FeedbackModal__label FeedbackModal__label--positives">
                        <FiThumbsUp /> What went well? (Positives)
                      </label>
                      <textarea
                        id="feedback-positives"
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
                      <label htmlFor="feedback-negatives" className="FeedbackModal__label FeedbackModal__label--negatives">
                        <FiTrendingUp /> What could be improved? (Constructive Feedback)
                      </label>
                      <textarea
                        id="feedback-negatives"
                        className="FeedbackModal__textarea"
                        placeholder="What could we do better? Pacing, technical setup, topic depth, suggestions for next time..."
                        value={negatives}
                        onChange={(e) => setNegatives(e.target.value)}
                        maxLength={MAX_LEN}
                        rows={3}
                      />
                      <span className="FeedbackModal__charCount">{negatives.length}/{MAX_LEN}</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step-2"
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="FeedbackModal__stepContent"
                  >
                    {/* General comments */}
                    <div className="FeedbackModal__group">
                      <label htmlFor="feedback-notes" className="FeedbackModal__label FeedbackModal__label--general">
                        <FiMessageSquare /> Additional Comments or Notes
                      </label>
                      <textarea
                        id="feedback-notes"
                        className="FeedbackModal__textarea"
                        placeholder="Any other thoughts, ideas, or recommendations..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        maxLength={MAX_LEN}
                        rows={3}
                      />
                      <span className="FeedbackModal__charCount">{feedback.length}/{MAX_LEN}</span>
                    </div>

                    {/* Anonymous toggle */}
                    <label className="FeedbackModal__checkboxContainer">
                      <input
                        id="feedback-anonymous"
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
                          <label htmlFor="feedback-name" className="FeedbackModal__fieldLabel">Your Name (Optional)</label>
                          <input
                            id="feedback-name"
                            type="text"
                            className="FeedbackModal__input"
                            placeholder="Ahmed Mostafa"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={120}
                          />
                        </div>
                        <div className="FeedbackModal__group">
                          <label htmlFor="feedback-email" className="FeedbackModal__fieldLabel">Your Email (Optional)</label>
                          <input
                            id="feedback-email"
                            type="email"
                            className="FeedbackModal__input"
                            placeholder="name@miuegypt.edu.eg"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            maxLength={255}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {error && (
              <div className="FeedbackModal__error">
                <FiAlertCircle style={{ marginRight: 6, flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div className="FeedbackModal__actions">
              {step === 1 ? (
                <>
                  {!isInline && onClose ? (
                    <button
                      key="fb-btn-cancel"
                      type="button"
                      className="FeedbackModal__btn FeedbackModal__btn--cancel"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                  ) : <div key="fb-btn-placeholder" />}

                  <button
                    key="fb-btn-next"
                    type="button"
                    className="FeedbackModal__btn FeedbackModal__btn--next"
                    onClick={() => goToStep(2)}
                  >
                    <span>Next: Details & Identity</span>
                    <FiArrowRight />
                  </button>
                </>
              ) : (
                <>
                  <button
                    key="fb-btn-back"
                    type="button"
                    className="FeedbackModal__btn FeedbackModal__btn--back"
                    onClick={() => goToStep(1)}
                    disabled={loading}
                  >
                    <FiArrowLeft />
                    <span>Back</span>
                  </button>

                  <button
                    key="fb-btn-submit"
                    type="button"
                    className="FeedbackModal__btn FeedbackModal__btn--submit"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    <FiSend />
                    <span>{loading ? 'Submitting...' : 'Submit Feedback'}</span>
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
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
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.96 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="FeedbackModal__motionWrapper"
        >
          {content}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
