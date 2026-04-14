import React from 'react';
import QuizStatusBadge from './QuizStatusBadge';

const formatDateTime = (value) => {
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

const QuizPageHeader = ({ quiz }) => {
  return (
    <header className="QuizPageHeader">
      <div className="QuizPageHeader__titleArea">
        <h1 className="QuizPageHeader__title">{quiz?.title || 'Quiz'}</h1>
        <QuizStatusBadge status={quiz?.status} />
      </div>
      {quiz?.description && <p className="QuizPageHeader__description">{quiz.description}</p>}
      <div className="QuizPageHeader__timeline">
        <span><strong>Start:</strong> {formatDateTime(quiz?.start_at)}</span>
        <span><strong>End:</strong> {formatDateTime(quiz?.end_at)}</span>
      </div>
    </header>
  );
};

export default QuizPageHeader;
