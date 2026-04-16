import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ApiService from '../../services/api';

function isRequiredQuestion(question) {
  return Boolean(
    question?.is_required ?? question?.required ?? question?.mandatory ?? false
  );
}

function normalizeQuestions(rawQuiz) {
  const questions = rawQuiz?.questions || rawQuiz?.quiz_questions || [];
  return questions.map((q, idx) => ({
    question_id: q.question_id ?? q.id,
    title: q.question_text ?? q.title ?? `Question ${idx + 1}`,
    question_type: (q.question_type || q.type || 'text').toLowerCase(),
    is_required: isRequiredQuestion(q),
    points: q.points ?? q.max_points ?? 0,
    options: (q.options || q.quiz_options || []).map((op, opIdx) => ({
      option_id: op.option_id ?? op.id ?? opIdx + 1,
      option_text: op.option_text ?? op.text ?? ''
    }))
  }));
}

function normalizeAttempt(rawAttempt) {
  if (!rawAttempt) return null;
  return {
    attempt_id: rawAttempt.attempt_id ?? rawAttempt.id,
    score: rawAttempt.score ?? null,
    status: rawAttempt.status || 'in_progress',
    started_at: rawAttempt.started_at || null,
    submitted_at: rawAttempt.submitted_at || null,
    answers: rawAttempt.answers || rawAttempt.quiz_answers || []
  };
}

/** True when an MCQ row has a chosen option (including numeric id 0, if ever used). */
function hasMcqSelection(answer) {
  const v = answer?.selected_option_id;
  return v !== null && v !== undefined && v !== '';
}

function normalizeAnswerMap(answers) {
  const map = {};
  (answers || []).forEach((a) => {
    const qid = a.question_id;
    if (!qid) return;
    map[qid] = {
      selected_option_id: a.selected_option_id ?? null,
      answer_text: a.answer_text ?? '',
      points_awarded: a.points_awarded ?? null
    };
  });
  return map;
}

export function useQuizAttempt({ quizId, userId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const saveTimersRef = useRef({});

  const load = useCallback(async () => {
    if (!quizId || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const rawQuiz = await ApiService.getQuizById(quizId);
      const safeQuiz = { ...rawQuiz, questions: normalizeQuestions(rawQuiz) };
      setQuiz(safeQuiz);

      // Try to resume existing attempt first to preserve previously saved answers.
      let existingAttempt = null;
      try {
        existingAttempt = await ApiService.getQuizAttemptByUser(quizId, userId);
      } catch (err) {
        existingAttempt = null;
      }

      let activeAttempt = normalizeAttempt(existingAttempt);
      // Start an attempt only when user has none.
      if (!activeAttempt) {
        const created = await ApiService.createQuizAttempt({ quiz_id: quizId, user_id: userId });
        activeAttempt = normalizeAttempt(created);
      }

      setAttempt(activeAttempt);
      setAnswers(normalizeAnswerMap(activeAttempt?.answers));
    } catch (err) {
      setError(err.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  }, [quizId, userId]);

  useEffect(() => {
    load();
    return () => {
      Object.values(saveTimersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, [load]);

  const saveAnswer = useCallback(async (questionId, payload) => {
    if (!attempt?.attempt_id) return;
    setSaving(true);
    setWarning(null);
    try {
      await ApiService.saveQuizAnswer(attempt.attempt_id, {
        question_id: questionId,
        ...payload
      });
    } catch (err) {
      setWarning(err.message || 'Auto-save failed. Your change may not be saved yet.');
    } finally {
      setSaving(false);
    }
  }, [attempt]);

  const updateAnswer = useCallback((question, value) => {
    const qid = question.question_id;
    const next = question.question_type === 'mcq'
      ? { selected_option_id: value, answer_text: '' }
      : { selected_option_id: null, answer_text: value };

    setAnswers((prev) => ({
      ...prev,
      [qid]: { ...(prev[qid] || {}), ...next }
    }));

    // Debounced autosave to avoid flooding API on each keystroke.
    if (saveTimersRef.current[qid]) clearTimeout(saveTimersRef.current[qid]);
    saveTimersRef.current[qid] = setTimeout(() => {
      saveAnswer(qid, next);
    }, 500);
  }, [saveAnswer]);

  const validationErrors = useMemo(() => {
    const out = {};
    (quiz?.questions || []).forEach((q) => {
      if (!q.is_required) return;
      const a = answers[q.question_id];
      const valid = q.question_type === 'mcq'
        ? hasMcqSelection(a)
        : Boolean(String(a?.answer_text || '').trim());
      if (!valid) out[q.question_id] = 'This question is required.';
    });
    return out;
  }, [quiz, answers]);

  const submitAttempt = useCallback(async () => {
    if (!attempt?.attempt_id) return false;
    if (Object.keys(validationErrors).length > 0) {
      setWarning('Please answer all required questions before submitting.');
      return false;
    }

    setSubmitting(true);
    setWarning(null);
    try {
      const updated = await ApiService.submitQuizAttempt(attempt.attempt_id, {
        status: 'submitted'
      });
      const normalized = normalizeAttempt(updated) || attempt;
      setAttempt(normalized);
      return true;
    } catch (err) {
      setWarning(err.message || 'Failed to submit quiz.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [attempt, validationErrors]);

  const progress = useMemo(() => {
    const total = (quiz?.questions || []).length;
    const answered = (quiz?.questions || []).filter((q) => {
      const a = answers[q.question_id];
      return q.question_type === 'mcq'
        ? hasMcqSelection(a)
        : Boolean(String(a?.answer_text || '').trim());
    }).length;
    return { total, answered };
  }, [quiz, answers]);

  return {
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
    submitAttempt,
    reload: load
  };
}

