const { Quiz } = require('../models');

/**
 * Quiz workspace loads by competition_id (see quiz.controller resolveQuiz).
 * `quiz` and `task_quiz` competitions share a `quizzes` row for admin status / Cairo schedule
 * (task quizzes use the same timing controls; MCQ questions remain quiz-only in admin API).
 */
async function ensureQuizForCompetition(competition, created_by) {
  if (!competition || !['quiz', 'task_quiz'].includes(competition.type)) return;
  const cid = competition.competition_id;
  // IMPORTANT:
  // `competitions.start_at/end_at` are used for REGISTRATION window.
  // Quiz availability must be controlled by the quiz schedule (set in quiz builder),
  // so the initial default quiz window must not start during registration.
  //
  // Default: quiz starts at the end of registration, ends 2 hours later.
  const regEnd = new Date(competition.end_at);
  const regEndMs = regEnd && Number.isFinite(regEnd.getTime()) ? regEnd.getTime() : null;
  const defaultQuizStartMs = regEndMs ?? new Date(competition.start_at).getTime();
  const defaultQuizEndMs = defaultQuizStartMs + 2 * 60 * 60 * 1000; // 2h default

  const payload = {
    title: competition.title,
    description: competition.description || null,
    start_at: new Date(defaultQuizStartMs),
    end_at: new Date(defaultQuizEndMs)
  };
  const existing = await Quiz.findOne({ where: { competition_id: cid } });
  if (existing) {
    // Keep admin-set quiz window; only sync title/description from the competition card.
    await existing.update({
      title: payload.title,
      description: payload.description
    });
    return;
  }
  await Quiz.create({
    ...payload,
    competition_id: cid,
    status: 'draft',
    created_by
  });
}

module.exports = { ensureQuizForCompetition };
