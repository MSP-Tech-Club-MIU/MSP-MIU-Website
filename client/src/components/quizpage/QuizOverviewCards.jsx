import React, { useMemo } from 'react';

const QuizOverviewCards = ({ quiz, questions }) => {
  const { totalQuestions, mcqCount, textCount, totalPoints } = useMemo(() => {
    const list = questions || [];
    return {
      totalQuestions: list.length,
      mcqCount: list.filter((q) => q.question_type === 'mcq').length,
      textCount: list.filter((q) => q.question_type === 'text').length,
      totalPoints: list.reduce((acc, q) => acc + Number(q.points || 0), 0)
    };
  }, [questions]);

  return (
    <section className="QuizOverviewCards">
      <article className="QuizOverviewCards__card">
        <h3>Competition Link</h3>
        <p>#{quiz?.competition_id ?? 'N/A'}</p>
      </article>
      <article className="QuizOverviewCards__card">
        <h3>Questions</h3>
        <p>{totalQuestions}</p>
      </article>
      <article className="QuizOverviewCards__card">
        <h3>Types</h3>
        <p>{mcqCount} MCQ / {textCount} Text</p>
      </article>
      <article className="QuizOverviewCards__card">
        <h3>Total Points</h3>
        <p>{totalPoints}</p>
      </article>
    </section>
  );
};

export default QuizOverviewCards;
