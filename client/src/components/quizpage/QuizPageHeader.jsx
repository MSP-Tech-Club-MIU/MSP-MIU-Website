import React from 'react';
import QuizStatusBadge from './QuizStatusBadge';
import { formatQuizDateTimeCairo } from '../../utils/quizTimeEgypt';

const QuizPageHeader = ({ quiz }) => {
  return (
    <header className="QuizPageHeader">
      <div className="QuizPageHeader__titleArea">
        <h1 className="QuizPageHeader__title">{quiz?.title || 'Quiz'}</h1>
        <QuizStatusBadge status={quiz?.status} />
      </div>
      {quiz?.description && <p className="QuizPageHeader__description">{quiz.description}</p>}
      <div className="QuizPageHeader__timeline">
        <span><strong>Start (Cairo):</strong> {formatQuizDateTimeCairo(quiz?.start_at)}</span>
        <span><strong>End (Cairo):</strong> {formatQuizDateTimeCairo(quiz?.end_at)}</span>
      </div>
    </header>
  );
};

export default QuizPageHeader;
