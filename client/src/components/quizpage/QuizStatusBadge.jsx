import React from 'react';

const STATUS_LABELS = {
  draft: 'Draft',
  published: 'Published',
  active: 'Active',
  closed: 'Closed'
};

const QuizStatusBadge = ({ status }) => {
  const normalized = (status || 'draft').toLowerCase();
  return (
    <span className={`QuizStatusBadge QuizStatusBadge--${normalized}`}>
      {STATUS_LABELS[normalized] || normalized}
    </span>
  );
};

export default QuizStatusBadge;
