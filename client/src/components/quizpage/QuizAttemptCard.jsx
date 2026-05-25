import React from 'react';

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const QuizAttemptCard = ({ attempt, currentUser }) => {
  return (
    <section className="QuizAttemptCard">
      <div className="QuizAttemptCard__header">
        <h2>Your Attempt</h2>
        <span>{currentUser ? currentUser.email : 'Guest'}</span>
      </div>

      {!attempt ? (
        <p className="QuizAttemptCard__empty">No attempt yet for this user.</p>
      ) : (
        <div className="QuizAttemptCard__grid">
          <div>
            <h4>Status</h4>
            <p>{attempt.status || 'in_progress'}</p>
          </div>
          <div>
            <h4>Score</h4>
            <p>{attempt.score ?? 'N/A'}</p>
          </div>
          <div>
            <h4>Started At</h4>
            <p>{formatDate(attempt.started_at)}</p>
          </div>
          <div>
            <h4>Submitted At</h4>
            <p>{formatDate(attempt.submitted_at)}</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default QuizAttemptCard;
