const { Quiz } = require('../models');

/**
 * Quiz workspace loads by competition_id (see quiz.controller resolveQuiz).
 * `quiz` and `task_quiz` competitions share a `quizzes` row for admin status / Cairo schedule
 * (task quizzes use the same timing controls; MCQ questions remain quiz-only in admin API).
 */
async function ensureQuizForCompetition(competition, created_by) {
  if (!competition || !['quiz', 'task_quiz'].includes(competition.type)) return;
  const cid = competition.competition_id;
  const payload = {
    title: competition.title,
    description: competition.description || null,
    start_at: competition.start_at,
    end_at: competition.end_at
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
