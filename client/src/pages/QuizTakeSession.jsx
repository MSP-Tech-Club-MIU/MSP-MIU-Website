import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiClock, FiAlertCircle } from 'react-icons/fi';
import SEO from '../components/SEO';
import PageLoader from '../components/PageLoader';
import ApiService from '../services/api';
import { useQuizAttempt } from '../components/quiz/useQuizAttempt';
import './QuizTakeSession.css';

function formatRemaining(ms) {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function flushSaveAnswer(attemptId, question, answers) {
  const qid = question.question_id;
  const a = answers[qid] || {};
  const payload =
    question.question_type === 'mcq'
      ? { question_id: qid, selected_option_id: a.selected_option_id ?? null }
      : { question_id: qid, answer_text: a.answer_text || '', text_answer: a.answer_text || '' };
  await ApiService.saveQuizAnswer(attemptId, payload);
}

function QuizTakeFlow({ quizId, userId, stepParam }) {
  const navigate = useNavigate();
  const stepNum = parseInt(stepParam, 10);
  const [saveError, setSaveError] = useState(null);
  const {
    loading,
    saving,
    submitting,
    quiz,
    attempt,
    answers,
    error,
    warning,
    validationErrors,
    updateAnswer,
    submitAttempt
  } = useQuizAttempt({ quizId, userId });

  const questions = quiz?.questions || [];
  const n = questions.length;
  const currentStep = useMemo(() => {
    if (!Number.isFinite(stepNum) || stepNum < 1) return 1;
    if (stepNum > n) return Math.max(1, n);
    return stepNum;
  }, [stepNum, n]);

  useEffect(() => {
    if (loading || !n) return;
    if (!Number.isFinite(stepNum) || stepNum < 1 || stepNum > n) {
      navigate(`/quizpage/${quizId}/take/${currentStep}`, { replace: true });
    }
  }, [loading, n, stepNum, currentStep, quizId, navigate]);

  const question = n ? questions[currentStep - 1] : null;
  const isSubmitted = attempt?.status === 'submitted';

  const deadlineMs = useMemo(() => {
    const quizEnd = quiz?.end_at ? new Date(quiz.end_at).getTime() : null;
    const limitMin =
      quiz?.time_limit_minutes != null && Number(quiz.time_limit_minutes) > 0
        ? Number(quiz.time_limit_minutes)
        : null;
    const started = attempt?.started_at ? new Date(attempt.started_at).getTime() : null;
    const personalEnd =
      limitMin && started != null && !Number.isNaN(started)
        ? started + limitMin * 60_000
        : null;
    if (personalEnd && quizEnd) return Math.min(personalEnd, quizEnd);
    return personalEnd || quizEnd;
  }, [quiz?.end_at, quiz?.time_limit_minutes, attempt?.started_at]);

  const [nowMono, setNowMono] = useState(() => Date.now());
  useEffect(() => {
    if (isSubmitted || quiz?.status !== 'active') return undefined;
    const id = setInterval(() => setNowMono(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isSubmitted, quiz?.status]);

  const remaining = deadlineMs != null ? Math.max(0, deadlineMs - nowMono) : null;

  const flowRef = useRef({});
  flowRef.current = { question, attempt, answers, quizId, navigate };
  const autoDoneRef = useRef(false);

  useEffect(() => {
    autoDoneRef.current = false;
  }, [attempt?.attempt_id, deadlineMs]);

  useEffect(() => {
    if (loading || isSubmitted || quiz?.status !== 'active' || deadlineMs == null) return undefined;
    const id = setInterval(async () => {
      if (autoDoneRef.current || Date.now() < deadlineMs) return;
      autoDoneRef.current = true;
      const { question: q, attempt: att, answers: ans, quizId: qid, navigate: nav } = flowRef.current;
      if (att?.attempt_id && q) {
        try {
          await flushSaveAnswer(att.attempt_id, q, ans);
        } catch {
          /* best-effort */
        }
        try {
          await ApiService.submitQuizAttempt(att.attempt_id, {});
        } catch {
          /* server may have auto-submitted */
        }
      }
      nav(`/quizpage/${qid}`);
    }, 1000);
    return () => clearInterval(id);
  }, [loading, isSubmitted, quiz?.status, deadlineMs, quizId]);

  const goBackSummary = () => navigate(`/quizpage/${quizId}`);

  const handlePrev = useCallback(async () => {
    if (!question || !attempt?.attempt_id || currentStep <= 1) return;
    try {
      await flushSaveAnswer(attempt.attempt_id, question, answers);
    } catch {
      /* still navigate */
    }
    navigate(`/quizpage/${quizId}/take/${currentStep - 1}`);
  }, [question, attempt, answers, currentStep, quizId, navigate]);

  const handleNextOrSubmit = useCallback(async () => {
    if (!question || !attempt?.attempt_id) return;
    setSaveError(null);
    try {
      await flushSaveAnswer(attempt.attempt_id, question, answers);
    } catch (e) {
      setSaveError(e.message || 'Could not save answer');
      return;
    }
    if (currentStep < n) {
      navigate(`/quizpage/${quizId}/take/${currentStep + 1}`);
    } else {
      const ok = await submitAttempt();
      if (ok) navigate(`/quizpage/${quizId}`);
    }
  }, [question, attempt, answers, currentStep, n, quizId, navigate, submitAttempt]);

  if (loading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <section className="QuizTake">
        <div className="QuizTake__container QuizTake__errorBox">
          <h2>Unable to load quiz</h2>
          <p>{error}</p>
          <button type="button" className="QuizTake__btn QuizTake__btn--secondary" onClick={goBackSummary}>
            Back to quiz
          </button>
        </div>
      </section>
    );
  }

  if (quiz?.status !== 'active') {
    return (
      <section className="QuizTake">
        <div className="QuizTake__container QuizTake__errorBox">
          <h2>Quiz not open for taking</h2>
          <p>
            Questions are available only while the quiz status is <strong>active</strong>. Current status:{' '}
            <strong>{quiz?.status || 'unknown'}</strong>.
          </p>
          <button type="button" className="QuizTake__btn QuizTake__btn--primary" onClick={goBackSummary}>
            Back to quiz summary
          </button>
        </div>
      </section>
    );
  }

  if (isSubmitted) {
    return (
      <section className="QuizTake">
        <div className="QuizTake__container QuizTake__errorBox">
          <h2>Already submitted</h2>
          <p>Your attempt is complete. View results on the quiz summary page.</p>
          <button type="button" className="QuizTake__btn QuizTake__btn--primary" onClick={goBackSummary}>
            Back to quiz summary
          </button>
        </div>
      </section>
    );
  }

  if (!question) {
    return (
      <section className="QuizTake">
        <div className="QuizTake__container QuizTake__errorBox">
          <h2>No questions</h2>
          <button type="button" className="QuizTake__btn QuizTake__btn--secondary" onClick={goBackSummary}>
            Back
          </button>
        </div>
      </section>
    );
  }

  const answer = answers[question.question_id] || {};
  const qErr = validationErrors[question.question_id];

  return (
    <section className="QuizTake">
      <SEO title={`${quiz?.title || 'Quiz'} — Question ${currentStep}`} description="Take the quiz" />
      <div className="QuizTake__container">
        <div className="QuizTake__top">
          <button type="button" className="QuizTake__back" onClick={goBackSummary}>
            <FiArrowLeft /> Quiz summary
          </button>
          <span className="QuizTake__progress">
            Question {currentStep} of {n}
          </span>
          {remaining != null && (
            <span className="QuizTake__timer">
              <FiClock /> {formatRemaining(remaining)}
            </span>
          )}
        </div>

        {(warning || saveError) && (
          <div className="QuizTake__warning">
            <FiAlertCircle style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
            {saveError || warning}
          </div>
        )}

        <article className="QuizTake__card">
          <div className="QuizTake__label">
            {question.question_type === 'mcq' ? 'Multiple choice' : 'Short answer'}
          </div>
          <h1 className="QuizTake__title">
            Q{currentStep}. {question.title}
          </h1>
          <p className="QuizTake__points">{Number(question.points) || 0} point(s)</p>

          {question.question_type === 'mcq' ? (
            <div className="QuizTake__options" role="radiogroup" aria-label="Answer choices">
              {(question.options || []).map((op) => (
                <label key={op.option_id} className="QuizTake__option">
                  <input
                    type="radio"
                    name={`take_q_${question.question_id}`}
                    checked={Number(answer.selected_option_id) === Number(op.option_id)}
                    onChange={() => updateAnswer(question, op.option_id)}
                  />
                  <span>{op.option_text}</span>
                </label>
              ))}
            </div>
          ) : (
            <textarea
              className="QuizTake__textarea"
              rows={5}
              placeholder="Type your answer..."
              value={answer.answer_text || ''}
              onChange={(e) => updateAnswer(question, e.target.value)}
            />
          )}

          {qErr ? <div className="QuizTake__fieldError">{qErr}</div> : null}
          {saving ? <div className="QuizTake__hint">Saving…</div> : null}
        </article>

        <div className="QuizTake__footer">
          <button
            type="button"
            className="QuizTake__btn QuizTake__btn--secondary"
            disabled={currentStep <= 1}
            onClick={handlePrev}
          >
            Previous
          </button>
          <button
            type="button"
            className="QuizTake__btn QuizTake__btn--primary"
            disabled={submitting}
            onClick={handleNextOrSubmit}
          >
            {submitting ? 'Submitting…' : currentStep < n ? 'Next question' : 'Submit quiz'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default function QuizTakeSession() {
  const { quizId, step } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState(undefined);

  useEffect(() => {
    if (!ApiService.isAuthenticated()) {
      navigate('/login', { replace: true, state: { from: location } });
      return;
    }
    ApiService.getProfile()
      .then((u) => setUserId(u.user_id))
      .catch(() => {
        setUserId(null);
        navigate('/login', { replace: true, state: { from: location } });
      });
  }, [navigate, location]);

  if (userId === undefined) {
    return <PageLoader />;
  }
  if (!userId) {
    return null;
  }

  return <QuizTakeFlow quizId={quizId} userId={userId} stepParam={step} />;
}
