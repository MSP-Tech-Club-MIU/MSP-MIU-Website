import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiCheckCircle } from 'react-icons/fi';
import SEO from '../components/SEO';
import BackButton from '../components/BackButton';
import ApiService from '../services/api';
import './PageBase.css';
import './Suggestions.css';

const MAX_LENGTH = 2000;

const Suggestions = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    suggestion: '',
    anonymous: false,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const onChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setSubmitError('');
  }, []);

  const validate = useCallback(() => {
    const next = {};
    if (!form.suggestion.trim()) {
      next.suggestion = 'Please write your suggestion';
    } else if (form.suggestion.trim().length > MAX_LENGTH) {
      next.suggestion = `Keep it under ${MAX_LENGTH} characters`;
    }
    if (!form.anonymous && !form.name.trim()) {
      next.name = 'Name is required unless you submit anonymously';
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address';
    }
    return next;
  }, [form]);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const v = validate();
      if (Object.keys(v).length) {
        setErrors(v);
        return;
      }

      setSubmitting(true);
      setSubmitError('');
      try {
        await ApiService.submitSuggestion({
          suggestion: form.suggestion.trim(),
          anonymous: form.anonymous,
          name: form.anonymous ? undefined : form.name.trim(),
          email: form.anonymous ? undefined : form.email.trim() || undefined,
        });
        setShowSuccess(true);
        setForm({ name: '', email: '', suggestion: '', anonymous: false });
        setErrors({});
      } catch (err) {
        setSubmitError(err.message || 'Failed to submit suggestion. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [form, validate]
  );

  const resetForm = () => {
    setShowSuccess(false);
    setSubmitError('');
  };

  return (
    <section className="PageBase SuggestionsPage">
      <SEO
        title="Suggestions"
        description="Share your ideas, feedback, and suggestions with the MSP Tech Club at MIU. Anyone can submit — anonymously if you prefer."
        url="/suggestions"
      />
      <BackButton to="/" label="Back to Home" />
      <div className="container">
        <motion.div
          className="neo-card SuggestionsPage__card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h1 className="card-title">Suggestions</h1>
          <p className="card-sub">
            Have an idea for an event, a workshop topic, or anything that could make the club better?
            We read every suggestion.
          </p>

          <AnimatePresence mode="wait">
            {showSuccess ? (
              <motion.div
                key="success"
                className="SuggestionsPage__success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}
              >
                <FiCheckCircle className="SuggestionsPage__successIcon" aria-hidden />
                <h2>Thank you!</h2>
                <p>Your suggestion was submitted successfully. We appreciate you taking the time.</p>
                <button type="button" className="SuggestionsPage__submit" onClick={resetForm}>
                  Send another
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                className="SuggestionsPage__form"
                onSubmit={onSubmit}
                noValidate
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <label className="SuggestionsPage__anon">
                  <input
                    type="checkbox"
                    name="anonymous"
                    checked={form.anonymous}
                    onChange={onChange}
                    disabled={submitting}
                  />
                  <span>Submit anonymously</span>
                </label>

                <AnimatePresence>
                  {!form.anonymous && (
                    <motion.div
                      className="SuggestionsPage__identity"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <label className="floating-input">
                        Name
                        <input
                          type="text"
                          name="name"
                          value={form.name}
                          onChange={onChange}
                          placeholder="Your name"
                          className={`pill ${errors.name ? 'error-border' : ''}`}
                          disabled={submitting}
                          maxLength={120}
                          autoComplete="name"
                        />
                        {errors.name && <span className="error">{errors.name}</span>}
                      </label>

                      <label className="floating-input">
                        Email <span className="SuggestionsPage__optional">(optional)</span>
                        <input
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={onChange}
                          placeholder="you@example.com"
                          className={`pill ${errors.email ? 'error-border' : ''}`}
                          disabled={submitting}
                          maxLength={255}
                          autoComplete="email"
                        />
                        {errors.email && <span className="error">{errors.email}</span>}
                      </label>
                    </motion.div>
                  )}
                </AnimatePresence>

                <label className="floating-input SuggestionsPage__suggestionField">
                  Your suggestion
                  <textarea
                    name="suggestion"
                    value={form.suggestion}
                    onChange={onChange}
                    placeholder="Tell us what you have in mind..."
                    className={`pill ${errors.suggestion ? 'error-border' : ''}`}
                    rows={6}
                    maxLength={MAX_LENGTH}
                    disabled={submitting}
                    required
                  />
                  <div className="SuggestionsPage__meta">
                    {errors.suggestion ? (
                      <span className="error">{errors.suggestion}</span>
                    ) : (
                      <span />
                    )}
                    <span className="SuggestionsPage__count">
                      {form.suggestion.length}/{MAX_LENGTH}
                    </span>
                  </div>
                </label>

                {submitError && (
                  <p className="SuggestionsPage__errorBanner" role="alert">
                    {submitError}
                  </p>
                )}

                <button
                  type="submit"
                  className="SuggestionsPage__submit"
                  disabled={submitting || !form.suggestion.trim()}
                >
                  <FiSend aria-hidden />
                  {submitting ? 'Sending...' : 'Send suggestion'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export { Suggestions };
export default Suggestions;
