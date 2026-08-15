const { Quiz, QuizAttempt, QuizAnswer } = require('../models');
const logger = require('../utils/logger');

function num(v, fallback = 0) {
  if (v == null) return fallback;
  if (typeof v === 'bigint') return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Latest moment the participant may still change answers: min(quiz end, started + limit).
 */
function getEffectiveDeadlineDate(quiz, attempt) {
  if (!quiz || !attempt) return null;
  const endAt = new Date(quiz.end_at);
  if (Number.isNaN(endAt.getTime())) return null;
  const limitMin = quiz.time_limit_minutes != null ? num(quiz.time_limit_minutes, 0) : 0;
  if (!limitMin || limitMin <= 0) {
    return endAt;
  }
  const started = new Date(attempt.started_at);
  if (Number.isNaN(started.getTime())) return endAt;
  const limitEnd = new Date(started.getTime() + limitMin * 60_000);
  return limitEnd < endAt ? limitEnd : endAt;
}

function isWithinQuizLiveWindow(quiz, now = new Date()) {
  if (!quiz?.start_at || !quiz?.end_at) return false;
  const start = new Date(quiz.start_at);
  const end = new Date(quiz.end_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  return now >= start && now < end;
}

async function computeAttemptScore(attemptId) {
  const answers = await QuizAnswer.findAll({ where: { attempt_id: attemptId } });
  const total = answers.reduce((acc, a) => acc + Number(a.awarded_points || 0), 0);
  await QuizAttempt.update({ score: total }, { where: { attempt_id: attemptId } });
  return total;
}

/**
 * Marks attempt submitted and sets score from saved answers. Idempotent for non–in-progress.
 */
async function finalizeQuizAttempt(attemptId) {
  const attempt = await QuizAttempt.findByPk(attemptId);
  if (!attempt || attempt.status !== 'in_progress') {
    return { ok: false, reason: 'not_in_progress', attempt: attempt || null };
  }
  const score = await computeAttemptScore(attemptId);
  await attempt.update({
    status: 'submitted',
    submitted_at: new Date(),
    score
  });
  await attempt.reload();
  return { ok: true, attempt, score };
}

async function runAutoSubmitExpiredAttempts() {
  const inProgress = await QuizAttempt.findAll({
    where: { status: 'in_progress' },
    include: [{ model: Quiz, as: 'quiz', required: true }]
  });
  let finalized = 0;
  const now = Date.now();
  for (const att of inProgress) {
    const deadline = getEffectiveDeadlineDate(att.quiz, att);
    if (deadline && now >= deadline.getTime()) {
      const r = await finalizeQuizAttempt(att.attempt_id);
      if (r.ok) finalized += 1;
    }
  }
  if (finalized > 0 && process.env.QUIZ_DEBUG === '1') {
    logger.info(`[quiz-auto-submit] Finalized ${finalized} attempt(s).`);
  }
  return finalized;
}

module.exports = {
  getEffectiveDeadlineDate,
  isWithinQuizLiveWindow,
  computeAttemptScore,
  finalizeQuizAttempt,
  runAutoSubmitExpiredAttempts
};
