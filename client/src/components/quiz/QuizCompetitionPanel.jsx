import React, { useMemo, useState } from 'react';
import { FiChevronDown, FiChevronUp, FiClock, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { useQuizAttempt } from './useQuizAttempt';
import './QuizCompetitionPanel.css';

function formatRemaining(ms) {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const QuizCompetitionPanel = ({ quizId, userId }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [collapsed, setCollapsed] = useState({});
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
    progress,
    updateAnswer,
    submitAttempt
  } = useQuizAttempt({ quizId, userId });

  const now = Date.now();
  const endAt = quiz?.end_at ? new Date(quiz.end_at).getTime() : null;
  const remaining = endAt ? Math.max(0, endAt - now) : null;
  const isSubmitted = attempt?.status === 'submitted';

  const totalPoints = useMemo(
    () => (quiz?.questions || []).reduce((acc, q) => acc + (Number(q.points) || 0), 0),
    [quiz]
  );

  if (loading) return <div className="QuizPanel">Loading quiz...</div>;
  if (error) {
    return (
      <div className="QuizPanel QuizPanel__error">
        <FiAlertCircle /> {error}
      </div>
    );
  }

  const questions = quiz?.questions || [];

  return (
    <div className="QuizPanel">
      <div className="QuizPanel__header">
        <h3>{quiz?.title || 'Quiz'}</h3>
        <div className="QuizPanel__meta">
          <span>{progress.answered}/{progress.total} answered</span>
          {remaining != null && (
            <span className="QuizPanel__timer">
              <FiClock /> {formatRemaining(remaining)}
            </span>
          )}
          <span>Points: {attempt?.score ?? 0}/{totalPoints}</span>
        </div>
      </div>

      {warning && <div className="QuizPanel__warning"><FiAlertCircle /> {warning}</div>}
      {saving && <div className="QuizPanel__hint">Auto-saving...</div>}

      <div className="QuizPanel__navigator">
        {questions.map((q, idx) => {
          const answered = q.question_type === 'mcq'
            ? Boolean(answers[q.question_id]?.selected_option_id)
            : Boolean(String(answers[q.question_id]?.answer_text || '').trim());
          return (
            <button
              key={q.question_id}
              className={`QuizPanel__navBtn ${idx === activeIndex ? 'active' : ''} ${answered ? 'answered' : 'unanswered'}`}
              onClick={() => setActiveIndex(idx)}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      <div className="QuizPanel__questions">
        {questions.map((q, idx) => {
          const isCollapsed = Boolean(collapsed[q.question_id]);
          const answer = answers[q.question_id] || {};
          const answered = q.question_type === 'mcq'
            ? Boolean(answer.selected_option_id)
            : Boolean(String(answer.answer_text || '').trim());

          return (
            <div key={q.question_id} className={`QuizPanel__card ${answered ? 'answered' : 'unanswered'}`}>
              <div className="QuizPanel__cardHeader">
                <button className="QuizPanel__titleBtn" onClick={() => setActiveIndex(idx)}>
                  <span>Q{idx + 1}. {q.title}</span>
                </button>
                <div className="QuizPanel__cardActions">
                  {answered && <FiCheckCircle className="QuizPanel__ok" />}
                  <button
                    className="QuizPanel__collapseBtn"
                    onClick={() => setCollapsed((prev) => ({ ...prev, [q.question_id]: !prev[q.question_id] }))}
                  >
                    {isCollapsed ? <FiChevronDown /> : <FiChevronUp />}
                  </button>
                </div>
              </div>

              {!isCollapsed && idx === activeIndex && (
                <div className="QuizPanel__cardBody">
                  {q.question_type === 'mcq' ? (
                    <div className="QuizPanel__options">
                      {q.options.map((op) => (
                        <label key={op.option_id} className="QuizPanel__option">
                          <input
                            type="radio"
                            name={`q_${q.question_id}`}
                            checked={Number(answer.selected_option_id) === Number(op.option_id)}
                            disabled={isSubmitted}
                            onChange={() => updateAnswer(q, op.option_id)}
                          />
                          <span>{op.option_text}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      className="QuizPanel__textInput"
                      rows={3}
                      disabled={isSubmitted}
                      placeholder="Type your answer..."
                      value={answer.answer_text || ''}
                      onChange={(e) => updateAnswer(q, e.target.value)}
                    />
                  )}

                  {validationErrors[q.question_id] && (
                    <div className="QuizPanel__fieldError">{validationErrors[q.question_id]}</div>
                  )}

                  {answer.points_awarded != null && (
                    <div className="QuizPanel__points">Points awarded: {answer.points_awarded}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="QuizPanel__footer">
        <button
          className="QuizPanel__submit"
          disabled={submitting || isSubmitted || remaining === 0}
          onClick={submitAttempt}
        >
          {isSubmitted ? 'Submitted' : submitting ? 'Submitting...' : 'Submit Quiz'}
        </button>
      </div>
    </div>
  );
};

export default QuizCompetitionPanel;

