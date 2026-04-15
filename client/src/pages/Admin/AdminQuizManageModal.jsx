import React, { useState, useEffect, useCallback } from 'react';
import { MdClose } from 'react-icons/md';
import ApiService from '../../services/api';
import { toCairoDateAndTimeStrings } from '../../utils/quizTimeEgypt';

/**
 * Admin quiz builder: status, questions, MCQ/text options (with correct answer).
 * Loaded only from AdminPanel for quiz-type competitions.
 */
const AdminQuizManageModal = ({ competition, onClose, setAlert }) => {
  const competitionId = competition?.competition_id;
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [statusDraft, setStatusDraft] = useState('draft');
  const [newQuestion, setNewQuestion] = useState({
    question_type: 'mcq',
    question_text: '',
    points: 1
  });
  const [questionDrafts, setQuestionDrafts] = useState({});
  const [optionDrafts, setOptionDrafts] = useState({});
  const [newOptionText, setNewOptionText] = useState({});
  const [textExpectedByQuestion, setTextExpectedByQuestion] = useState({});
  const [schedStartDate, setSchedStartDate] = useState('');
  const [schedStartTime, setSchedStartTime] = useState('');
  const [schedEndDate, setSchedEndDate] = useState('');
  const [schedEndTime, setSchedEndTime] = useState('');
  const [schedTimeLimit, setSchedTimeLimit] = useState('');

  const syncDraftsFromQuiz = useCallback((data) => {
    if (!data?.questions) return;
    const qd = {};
    const od = {};
    const te = {};
    data.questions.forEach((q) => {
      qd[q.question_id] = {
        question_text: q.question_text,
        points: q.points,
        question_type: q.question_type
      };
      (q.options || []).forEach((o) => {
        od[o.option_id] = o.option_text;
      });
      if (q.question_type === 'text') {
        const c = (q.options || []).find((o) => o.is_correct);
        te[q.question_id] = c?.option_text || '';
      }
    });
    setQuestionDrafts(qd);
    setOptionDrafts(od);
    setTextExpectedByQuestion(te);
  }, []);

  useEffect(() => {
    if (!competitionId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await ApiService.getAdminQuiz(competitionId);
        if (!cancelled) {
          setQuizData(data);
          setStatusDraft(data.status || 'draft');
          syncDraftsFromQuiz(data);
        }
      } catch (err) {
        if (!cancelled) {
          setAlert({ type: 'error', message: err.message || 'Failed to load quiz' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [competitionId, setAlert, syncDraftsFromQuiz]);

  useEffect(() => {
    if (!quizData?.start_at) return;
    const s = toCairoDateAndTimeStrings(quizData.start_at);
    const e = toCairoDateAndTimeStrings(quizData.end_at);
    setSchedStartDate(s.date);
    setSchedStartTime(s.time);
    setSchedEndDate(e.date);
    setSchedEndTime(e.time);
    setSchedTimeLimit(
      quizData.time_limit_minutes != null && Number(quizData.time_limit_minutes) > 0
        ? String(quizData.time_limit_minutes)
        : ''
    );
  }, [quizData?.start_at, quizData?.end_at, quizData?.time_limit_minutes]);

  const run = async (action, successMessage) => {
    setBusy(true);
    try {
      const data = await action();
      setQuizData(data);
      syncDraftsFromQuiz(data);
      setStatusDraft(data.status || 'draft');
      if (successMessage) setAlert({ type: 'success', message: successMessage });
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Request failed' });
    } finally {
      setBusy(false);
    }
  };

  const saveStatus = () =>
    run(
      () => ApiService.patchAdminQuiz(competitionId, { status: statusDraft }),
      'Quiz status updated.'
    );

  const saveSchedule = () => {
    if (!schedStartDate || !schedStartTime || !schedEndDate || !schedEndTime) {
      setAlert({ type: 'error', message: 'Set both start and end date and time (Cairo).' });
      return;
    }
    const start_at_cairo = `${schedStartDate}T${schedStartTime}`;
    const end_at_cairo = `${schedEndDate}T${schedEndTime}`;
    const tl = String(schedTimeLimit || '').trim();
    return run(
      () =>
        ApiService.patchAdminQuiz(competitionId, {
          start_at_cairo,
          end_at_cairo,
          time_limit_minutes: tl === '' ? null : Number(tl)
        }),
      'Quiz schedule updated.'
    );
  };

  const addQuestion = () => {
    const text = (newQuestion.question_text || '').trim();
    if (!text) {
      setAlert({ type: 'error', message: 'Question text is required' });
      return;
    }
    return run(
      () =>
        ApiService.createAdminQuizQuestion(competitionId, {
          question_type: newQuestion.question_type,
          question_text: text,
          points: Number(newQuestion.points) || 1
        }),
      'Question added.'
    ).then(() => {
      setNewQuestion({ question_type: 'mcq', question_text: '', points: 1 });
    });
  };

  const saveQuestion = (questionId) => {
    const d = questionDrafts[questionId];
    if (!d) return;
    const text = (d.question_text || '').trim();
    if (!text) {
      setAlert({ type: 'error', message: 'Question text cannot be empty' });
      return;
    }
    return run(
      () =>
        ApiService.updateAdminQuizQuestion(questionId, {
          question_text: text,
          points: Number(d.points) || 0,
          question_type: d.question_type
        }),
      'Question saved.'
    );
  };

  const removeQuestion = (questionId) => {
    if (!window.confirm('Delete this question and all its options?')) return;
    return run(() => ApiService.deleteAdminQuizQuestion(questionId), 'Question removed.');
  };

  const addOption = (questionId) => {
    const text = (newOptionText[questionId] || '').trim();
    if (!text) {
      setAlert({ type: 'error', message: 'Option text is required' });
      return;
    }
    return run(
      () =>
        ApiService.createAdminQuizOption(questionId, {
          option_text: text,
          is_correct: false
        }),
      'Option added.'
    ).then(() => {
      setNewOptionText((prev) => ({ ...prev, [questionId]: '' }));
    });
  };

  const saveOption = (optionId) => {
    const text = (optionDrafts[optionId] || '').trim();
    if (!text) {
      setAlert({ type: 'error', message: 'Option text cannot be empty' });
      return;
    }
    return run(
      () => ApiService.updateAdminQuizOption(optionId, { option_text: text }),
      'Option saved.'
    );
  };

  const setCorrectOption = (optionId) =>
    run(() => ApiService.updateAdminQuizOption(optionId, { is_correct: true }), 'Correct answer updated.');

  const removeOption = (optionId) => {
    if (!window.confirm('Delete this option?')) return;
    return run(() => ApiService.deleteAdminQuizOption(optionId), 'Option removed.');
  };

  const setTextExpectedAnswer = (questionId, optionId, text) => {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      setAlert({ type: 'error', message: 'Expected answer cannot be empty' });
      return;
    }
    if (optionId) {
      return run(
        () => ApiService.updateAdminQuizOption(optionId, { option_text: trimmed, is_correct: true }),
        'Expected answer saved.'
      );
    }
    return run(
      () =>
        ApiService.createAdminQuizOption(questionId, {
          option_text: trimmed,
          is_correct: true
        }),
      'Expected answer set.'
    );
  };

  return (
    <div className="AdminPanel__modalOverlay" onClick={onClose}>
      <div
        className="AdminPanel__modalContent AdminPanel__modalContent--large AdminPanel__quizModal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="AdminPanel__modalHeader">
          <div>
            <h3>Manage quiz</h3>
            <p className="AdminPanel__quizModalSub">{competition?.title}</p>
          </div>
          <button type="button" className="AdminPanel__modalClose" onClick={onClose} aria-label="Close">
            <MdClose />
          </button>
        </div>

        {loading ? (
          <div className="AdminPanel__loading">Loading quiz…</div>
        ) : !quizData ? (
          <div className="AdminPanel__emptyState">Could not load quiz.</div>
        ) : (
          <div className="AdminPanel__quizModalBody">
            <p className="AdminPanel__quizHint">
              <strong>Quiz status</strong> is separate from the competition row. Setting status to{' '}
              <em>active</em> closes new team registrations for this quiz (per server rules). Participants can
              take the quiz when status is <em>published</em> or <em>active</em>.
            </p>

            <div className="AdminPanel__quizStatusRow">
              <label className="AdminPanel__formGroup" style={{ flex: 1, marginBottom: 0 }}>
                <span>Status</span>
                <select
                  value={statusDraft}
                  disabled={busy}
                  onChange={(e) => setStatusDraft(e.target.value)}
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="active">active</option>
                  <option value="closed">closed</option>
                </select>
              </label>
              <button
                type="button"
                className="AdminPanel__actionBtn AdminPanel__actionBtn--approve"
                disabled={busy || statusDraft === quizData.status}
                onClick={saveStatus}
              >
                Save status
              </button>
            </div>

            <div className="AdminPanel__quizScheduleBlock">
              <h4>Quiz window &amp; duration (Africa / Cairo)</h4>
              <p className="AdminPanel__quizHint">
                Times below are <strong>local Egypt (Cairo)</strong> wall clock, including daylight saving when
                it applies. The quiz automatically submits each in-progress attempt at the earlier of: scheduled
                end, or (optional) time limit from when the participant started.
              </p>
              <div className="AdminPanel__formRow">
                <label className="AdminPanel__formGroup">
                  Start date
                  <input
                    type="date"
                    value={schedStartDate}
                    disabled={busy}
                    onChange={(e) => setSchedStartDate(e.target.value)}
                  />
                </label>
                <label className="AdminPanel__formGroup">
                  Start time
                  <input
                    type="time"
                    value={schedStartTime}
                    disabled={busy}
                    onChange={(e) => setSchedStartTime(e.target.value)}
                  />
                </label>
                <label className="AdminPanel__formGroup">
                  End date
                  <input
                    type="date"
                    value={schedEndDate}
                    disabled={busy}
                    onChange={(e) => setSchedEndDate(e.target.value)}
                  />
                </label>
                <label className="AdminPanel__formGroup">
                  End time
                  <input
                    type="time"
                    value={schedEndTime}
                    disabled={busy}
                    onChange={(e) => setSchedEndTime(e.target.value)}
                  />
                </label>
              </div>
              <label className="AdminPanel__formGroup">
                Max minutes per attempt (optional)
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 45 — leave empty to use only the end time above"
                  value={schedTimeLimit}
                  disabled={busy}
                  onChange={(e) => setSchedTimeLimit(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="AdminPanel__actionBtn AdminPanel__actionBtn--approve"
                disabled={busy}
                onClick={saveSchedule}
              >
                Save schedule
              </button>
            </div>

            <div className="AdminPanel__quizNewQuestion">
              <h4>Add question</h4>
              <div className="AdminPanel__formRow">
                <label className="AdminPanel__formGroup">
                  Type
                  <select
                    value={newQuestion.question_type}
                    disabled={busy}
                    onChange={(e) =>
                      setNewQuestion((n) => ({ ...n, question_type: e.target.value }))
                    }
                  >
                    <option value="mcq">Multiple choice (MCQ)</option>
                    <option value="text">Short text (exact match)</option>
                  </select>
                </label>
                <label className="AdminPanel__formGroup">
                  Points
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={newQuestion.points}
                    disabled={busy}
                    onChange={(e) =>
                      setNewQuestion((n) => ({ ...n, points: e.target.value }))
                    }
                  />
                </label>
              </div>
              <label className="AdminPanel__formGroup">
                Question text
                <textarea
                  rows={2}
                  value={newQuestion.question_text}
                  disabled={busy}
                  onChange={(e) =>
                    setNewQuestion((n) => ({ ...n, question_text: e.target.value }))
                  }
                  placeholder="Enter the question"
                />
              </label>
              <button
                type="button"
                className="AdminPanel__addBtn"
                disabled={busy}
                onClick={addQuestion}
              >
                Add question
              </button>
            </div>

            <div className="AdminPanel__quizQuestionList">
              <h4>Questions ({quizData.questions?.length || 0})</h4>
              {(quizData.questions || []).length === 0 ? (
                <p className="AdminPanel__emptyState">No questions yet.</p>
              ) : (
                (quizData.questions || []).map((q) => {
                  const draft = questionDrafts[q.question_id] || {
                    question_text: q.question_text,
                    points: q.points,
                    question_type: q.question_type
                  };
                  const correctOpt = (q.options || []).find((o) => o.is_correct);
                  return (
                    <div key={q.question_id} className="AdminPanel__quizQuestionCard">
                      <div className="AdminPanel__quizQuestionCardHead">
                        <span className="AdminPanel__badge AdminPanel__badge--open">
                          {q.question_type === 'mcq' ? 'MCQ' : 'Text'}
                        </span>
                        <span className="AdminPanel__quizMeta">#{q.position}</span>
                      </div>
                      <div className="AdminPanel__formRow">
                        <label className="AdminPanel__formGroup">
                          Type
                          <select
                            value={draft.question_type}
                            disabled={busy}
                            onChange={(e) =>
                              setQuestionDrafts((prev) => ({
                                ...prev,
                                [q.question_id]: { ...draft, question_type: e.target.value }
                              }))
                            }
                          >
                            <option value="mcq">MCQ</option>
                            <option value="text">Text</option>
                          </select>
                        </label>
                        <label className="AdminPanel__formGroup">
                          Points
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={draft.points}
                            disabled={busy}
                            onChange={(e) =>
                              setQuestionDrafts((prev) => ({
                                ...prev,
                                [q.question_id]: { ...draft, points: e.target.value }
                              }))
                            }
                          />
                        </label>
                      </div>
                      <label className="AdminPanel__formGroup">
                        Question text
                        <textarea
                          rows={2}
                          value={draft.question_text}
                          disabled={busy}
                          onChange={(e) =>
                            setQuestionDrafts((prev) => ({
                              ...prev,
                              [q.question_id]: { ...draft, question_text: e.target.value }
                            }))
                          }
                        />
                      </label>
                      <div className="AdminPanel__quizQuestionActions">
                        <button
                          type="button"
                          className="AdminPanel__actionBtn AdminPanel__actionBtn--approve"
                          disabled={busy}
                          onClick={() => saveQuestion(q.question_id)}
                        >
                          Save question
                        </button>
                        <button
                          type="button"
                          className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                          disabled={busy}
                          onClick={() => removeQuestion(q.question_id)}
                        >
                          Delete
                        </button>
                      </div>

                      {draft.question_type === 'mcq' && (
                        <div className="AdminPanel__quizOptionsBlock">
                          <p className="AdminPanel__quizOptionsTitle">Choices (select one correct)</p>
                          <ul className="AdminPanel__quizOptionList">
                            {(q.options || []).map((o) => (
                              <li key={o.option_id} className="AdminPanel__quizOptionRow">
                                <label className="AdminPanel__quizRadio">
                                  <input
                                    type="radio"
                                    name={`correct-${q.question_id}`}
                                    checked={!!o.is_correct}
                                    disabled={busy}
                                    onChange={() => setCorrectOption(o.option_id)}
                                  />
                                </label>
                                <input
                                  type="text"
                                  className="AdminPanel__quizOptionInput"
                                  value={optionDrafts[o.option_id] ?? o.option_text}
                                  disabled={busy}
                                  onChange={(e) =>
                                    setOptionDrafts((prev) => ({
                                      ...prev,
                                      [o.option_id]: e.target.value
                                    }))
                                  }
                                />
                                <button
                                  type="button"
                                  className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                                  disabled={busy}
                                  onClick={() => saveOption(o.option_id)}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                                  disabled={busy}
                                  onClick={() => removeOption(o.option_id)}
                                >
                                  ×
                                </button>
                              </li>
                            ))}
                          </ul>
                          <div className="AdminPanel__quizAddOption">
                            <input
                              type="text"
                              placeholder="New choice text"
                              value={newOptionText[q.question_id] || ''}
                              disabled={busy}
                              onChange={(e) =>
                                setNewOptionText((prev) => ({
                                  ...prev,
                                  [q.question_id]: e.target.value
                                }))
                              }
                            />
                            <button
                              type="button"
                              className="AdminPanel__actionBtn AdminPanel__actionBtn--view"
                              disabled={busy}
                              onClick={() => addOption(q.question_id)}
                            >
                              Add choice
                            </button>
                          </div>
                        </div>
                      )}

                      {draft.question_type === 'text' && (
                        <div className="AdminPanel__quizOptionsBlock">
                          <p className="AdminPanel__quizOptionsTitle">
                            Expected answer (graded by exact string match, trim applied)
                          </p>
                          <div className="AdminPanel__quizTextAnswerRow">
                            <input
                              type="text"
                              className="AdminPanel__quizOptionInput"
                              placeholder="Exact expected answer"
                              value={textExpectedByQuestion[q.question_id] ?? ''}
                              disabled={busy}
                              onChange={(e) =>
                                setTextExpectedByQuestion((prev) => ({
                                  ...prev,
                                  [q.question_id]: e.target.value
                                }))
                              }
                            />
                            <button
                              type="button"
                              className="AdminPanel__actionBtn AdminPanel__actionBtn--approve"
                              disabled={busy}
                              onClick={() =>
                                setTextExpectedAnswer(
                                  q.question_id,
                                  correctOpt?.option_id,
                                  textExpectedByQuestion[q.question_id]
                                )
                              }
                            >
                              Save answer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminQuizManageModal;
