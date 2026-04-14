import React, { useMemo } from 'react';

const normalizeAnswers = (attempt) => {
  const map = new Map();
  (attempt?.answers || []).forEach((answer) => {
    map.set(answer.question_id, answer);
  });
  return map;
};

function mcqHasSolutionMeta(question) {
  const opts = question?.options;
  if (!Array.isArray(opts) || opts.length === 0) return false;
  return opts.some((o) => typeof o.is_correct === 'boolean');
}

const QuizQuestionsList = ({ questions, attempt }) => {
  const answerMap = useMemo(() => normalizeAnswers(attempt), [attempt]);
  const showSolutionKey = Boolean(attempt?.review?.questions?.length);

  return (
    <section className="QuizQuestionsList">
      <h2>Questions</h2>
      {showSolutionKey && (
        <p className="QuizQuestionsList__solutionHint">
          Green marks the correct answer(s). Red marks your choice when it was incorrect.
        </p>
      )}
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
              const hasMcqMeta = question.question_type === 'mcq' && mcqHasSolutionMeta(question);
              const expectedText =
                question.question_type === 'text' ? question.correct_answer_text : null;

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
                      {question.options.map((option) => {
                        const picked = Number(selectedOptionId) === Number(option.option_id);
                        const isCorrect = !!option.is_correct;
                        const liClass = ['QuizQuestionsList__option'];
                        if (hasMcqMeta) {
                          if (isCorrect) liClass.push('QuizQuestionsList__option--correct');
                          if (picked && !isCorrect) liClass.push('QuizQuestionsList__option--wrongPick');
                        } else if (picked) {
                          liClass.push('QuizQuestionsList__option--selectedLegacy');
                        }
                        return (
                          <li key={option.option_id} className={liClass.join(' ')}>
                            {option.option_text}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="QuizQuestionsList__textBlock">
                      <div
                        className={
                          answer?.is_correct === true
                            ? 'QuizQuestionsList__yourText QuizQuestionsList__yourText--correct'
                            : answer?.is_correct === false
                              ? 'QuizQuestionsList__yourText QuizQuestionsList__yourText--wrong'
                              : 'QuizQuestionsList__yourText'
                        }
                      >
                        <strong>Your answer:</strong> {answer?.answer_text || 'No answer yet'}
                      </div>
                      {expectedText != null && String(expectedText).length > 0 ? (
                        <div className="QuizQuestionsList__expectedText">
                          <strong>Correct answer:</strong> {expectedText}
                        </div>
                      ) : null}
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
