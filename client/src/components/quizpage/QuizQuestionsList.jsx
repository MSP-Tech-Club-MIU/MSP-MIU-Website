import React, { useMemo } from 'react';

const normalizeAnswers = (attempt) => {
  const map = new Map();
  (attempt?.answers || []).forEach((answer) => {
    map.set(answer.question_id, answer);
  });
  return map;
};

const QuizQuestionsList = ({ questions, attempt }) => {
  const answerMap = useMemo(() => normalizeAnswers(attempt), [attempt]);

  return (
    <section className="QuizQuestionsList">
      <h2>Questions</h2>
      {questions.length === 0 ? (
        <p className="QuizQuestionsList__empty">No questions found for this quiz.</p>
      ) : (
        <div className="QuizQuestionsList__list">
          {questions
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((question, index) => {
              const answer = answerMap.get(question.question_id);
              const selectedOptionId = answer?.selected_option_id;
              return (
                <article className="QuizQuestionsList__card" key={question.question_id}>
                  <div className="QuizQuestionsList__head">
                    <span>Q{index + 1}</span>
                    <span>{question.question_type.toUpperCase()}</span>
                    <span>{question.points} pts</span>
                  </div>

                  <p className="QuizQuestionsList__text">{question.question_text}</p>

                  {question.question_type === 'mcq' ? (
                    <ul className="QuizQuestionsList__options">
                      {question.options.map((option) => (
                        <li
                          key={option.option_id}
                          className={Number(selectedOptionId) === Number(option.option_id) ? 'selected' : ''}
                        >
                          {option.option_text}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="QuizQuestionsList__textAnswer">
                      <strong>Text answer:</strong> {answer?.answer_text || 'No answer yet'}
                    </div>
                  )}

                  <div className="QuizQuestionsList__answerMeta">
                    <span>Correct: {answer?.is_correct == null ? 'N/A' : answer.is_correct ? 'Yes' : 'No'}</span>
                    <span>Awarded Points: {answer?.points_awarded ?? 'N/A'}</span>
                  </div>
                </article>
              );
            })}
        </div>
      )}
    </section>
  );
};

export default QuizQuestionsList;
