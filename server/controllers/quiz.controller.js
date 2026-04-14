const { Op } = require('sequelize');
const db = require('../config/db');
const { Quiz, QuizQuestion, QuizOption, QuizAttempt, QuizAnswer } = require('../models');

/** Safe for JSON (MySQL BIGINT / DECIMAL can arrive as BigInt or strings). */
function num(v, fallback = 0) {
  if (v == null) return fallback;
  if (typeof v === 'bigint') return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Resolve quiz from route/body id. The app passes competition_id from CompetitionWorkspace
 * (`QuizCompetitionPanel quizId={competitionId}`), so we must look up by competition_id first.
 * Fallback: treat id as quizzes.quiz_id for direct/admin-style calls.
 */
async function resolveQuiz(idOrCompetition) {
  const n = parseInt(idOrCompetition, 10);
  if (Number.isNaN(n)) return null;

  let quiz = await Quiz.findOne({ where: { competition_id: n } });
  if (!quiz) {
    quiz = await Quiz.findByPk(n);
  }
  return quiz;
}

/** Participant attempts allowed only when quiz is published or active (not draft/closed). */
function quizAllowsParticipantAttempts(status) {
  return status === 'published' || status === 'active';
}

async function computeAttemptScore(attemptId) {
  const answers = await QuizAnswer.findAll({ where: { attempt_id: attemptId } });
  const total = answers.reduce((acc, a) => acc + Number(a.awarded_points || 0), 0);
  await QuizAttempt.update({ score: total }, { where: { attempt_id: attemptId } });
  return total;
}

async function getQuizById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid quiz id' });

    const quiz = await resolveQuiz(id);
    if (!quiz) return res.status(404).json({ success: false, error: 'Quiz not found' });

    const questions = await QuizQuestion.findAll({
      where: { quiz_id: quiz.quiz_id },
      order: [['position', 'ASC']]
    });

    const questionIds = questions.map((q) => q.question_id).filter((id) => id != null);
    const options = questionIds.length > 0
      ? await QuizOption.findAll({
          where: { question_id: { [Op.in]: questionIds } },
          order: [['position', 'ASC']]
        })
      : [];

    const byQuestion = new Map();
    options.forEach((o) => {
      const key = num(o.question_id, 0);
      if (!byQuestion.has(key)) byQuestion.set(key, []);
      byQuestion.get(key).push({
        option_id: num(o.option_id),
        option_text: o.option_text
      });
    });

    // Summary-only for draft/published: hide stems and choices until quiz is active (or closed for review).
    const includeQuestionBodies = quiz.status === 'active' || quiz.status === 'closed';

    const questionsPayload = questions.map((q) => {
      const qid = num(q.question_id, 0);
      const base = {
        question_id: qid,
        question_type: q.question_type,
        points: q.points != null ? num(q.points, 0) : 0,
        position: num(q.position, 0)
      };
      if (includeQuestionBodies) {
        return {
          ...base,
          question_text: q.question_text,
          options: byQuestion.get(qid) || []
        };
      }
      return {
        ...base,
        question_text: null,
        options: []
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        quiz_id: num(quiz.quiz_id),
        competition_id: num(quiz.competition_id),
        title: quiz.title,
        description: quiz.description,
        start_at: quiz.start_at,
        end_at: quiz.end_at,
        time_limit: null,
        status: quiz.status,
        questions: questionsPayload
      }
    });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    const expose =
      process.env.NODE_ENV === 'development' || process.env.QUIZ_DEBUG === '1';
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz',
      details: expose ? error.message : undefined
    });
  }
}

async function getQuizAttemptByUser(req, res) {
  try {
    const quizIdParam = parseInt(req.params.quizId, 10);
    const userId = parseInt(req.params.userId, 10);
    if (Number.isNaN(quizIdParam) || Number.isNaN(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid ids' });
    }

    const quiz = await resolveQuiz(quizIdParam);
    if (!quiz) return res.status(404).json({ success: false, error: 'Quiz not found' });

    const attempt = await QuizAttempt.findOne({
      where: { quiz_id: quiz.quiz_id, user_id: userId },
      order: [['attempt_id', 'DESC']]
    });
    if (!attempt) return res.status(404).json({ success: false, error: 'Attempt not found' });

    const answers = await QuizAnswer.findAll({ where: { attempt_id: attempt.attempt_id } });
    return res.status(200).json({
      success: true,
      data: {
        attempt_id: attempt.attempt_id,
        quiz_id: attempt.quiz_id,
        user_id: attempt.user_id,
        status: attempt.status,
        score: attempt.score,
        started_at: attempt.started_at,
        submitted_at: attempt.submitted_at,
        answers: answers.map((a) => ({
          answer_id: a.answer_id,
          question_id: a.question_id,
          selected_option_id: a.selected_option_id,
          answer_text: a.text_answer,
          is_correct: a.is_correct,
          points_awarded: a.awarded_points
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching attempt:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch attempt' });
  }
}

async function createQuizAttempt(req, res) {
  try {
    const quizIdInput = parseInt(req.body.quiz_id, 10);
    if (Number.isNaN(quizIdInput)) return res.status(400).json({ success: false, error: 'quiz_id is required' });

    const quiz = await resolveQuiz(quizIdInput);
    if (!quiz) return res.status(404).json({ success: false, error: 'Quiz not found' });
    if (!quizAllowsParticipantAttempts(quiz.status)) {
      return res.status(403).json({
        success: false,
        error: 'This quiz is not open for attempts yet'
      });
    }

    const userId = req.user.user_id;
    const memberships = await db.query(
      `SELECT t.team_id
       FROM teams t
       INNER JOIN team_members tm ON tm.team_id = t.team_id
       WHERE t.competition_id = ? AND tm.user_id = ?
       LIMIT 1`,
      {
        replacements: [quiz.competition_id, userId],
        type: db.QueryTypes.SELECT
      }
    );
    if (!memberships || memberships.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'You must complete team registration for this quiz before starting an attempt'
      });
    }

    let attempt = await QuizAttempt.findOne({
      where: { quiz_id: quiz.quiz_id, user_id: userId, status: 'in_progress' },
      order: [['attempt_id', 'DESC']]
    });
    if (!attempt) {
      attempt = await QuizAttempt.create({
        quiz_id: quiz.quiz_id,
        user_id: userId,
        status: 'in_progress'
      });
    }

    return res.status(201).json({ success: true, data: attempt });
  } catch (error) {
    console.error('Error creating attempt:', error);
    return res.status(500).json({ success: false, error: 'Failed to create attempt' });
  }
}

async function saveQuizAnswer(req, res) {
  try {
    const attemptId = parseInt(req.params.attemptId, 10);
    const { question_id, selected_option_id, answer_text, text_answer } = req.body;
    if (Number.isNaN(attemptId) || !question_id) {
      return res.status(400).json({ success: false, error: 'attempt_id and question_id are required' });
    }

    const attempt = await QuizAttempt.findByPk(attemptId);
    if (!attempt) return res.status(404).json({ success: false, error: 'Attempt not found' });
    if (attempt.user_id !== req.user.user_id && !['admin', 'board'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ success: false, error: 'Attempt is already submitted' });
    }

    const quizForAttempt = await Quiz.findByPk(attempt.quiz_id);
    if (!quizForAttempt || !quizAllowsParticipantAttempts(quizForAttempt.status)) {
      return res.status(403).json({
        success: false,
        error: 'This quiz is not open for attempts'
      });
    }

    const question = await QuizQuestion.findByPk(question_id);
    if (!question || question.quiz_id !== attempt.quiz_id) {
      return res.status(400).json({ success: false, error: 'Question does not belong to this quiz attempt' });
    }

    let isCorrect = null;
    let awardedPoints = 0;
    const normalizedText = (answer_text ?? text_answer ?? '').toString().trim();
    const normalizedOptionId = (() => {
      const v = selected_option_id;
      if (v === null || v === undefined || v === '') return null;
      const n = parseInt(String(v), 10);
      return Number.isNaN(n) ? null : n;
    })();

    if (question.question_type === 'mcq') {
      const correct = await QuizOption.findOne({
        where: { question_id: question.question_id, is_correct: true }
      });
      if (correct && normalizedOptionId != null) {
        isCorrect = Number(correct.option_id) === Number(normalizedOptionId);
        awardedPoints = isCorrect ? Number(question.points) : 0;
      }
    } else if (question.question_type === 'text') {
      const correctTextOption = await QuizOption.findOne({
        where: { question_id: question.question_id, is_correct: true }
      });
      if (correctTextOption) {
        isCorrect = correctTextOption.option_text.trim() === normalizedText;
        awardedPoints = isCorrect ? Number(question.points) : 0;
      }
    }

    const [answer, created] = await QuizAnswer.findOrCreate({
      where: { attempt_id: attemptId, question_id: question.question_id },
      defaults: {
        selected_option_id: normalizedOptionId,
        text_answer: normalizedText || null,
        is_correct: isCorrect,
        awarded_points: awardedPoints
      }
    });

    if (!created) {
      await answer.update({
        selected_option_id: normalizedOptionId,
        text_answer: normalizedText || null,
        is_correct: isCorrect,
        awarded_points: awardedPoints
      });
    }

    const score = await computeAttemptScore(attemptId);
    return res.status(200).json({
      success: true,
      data: {
        answer_id: answer.answer_id,
        attempt_id: attemptId,
        question_id: question.question_id,
        selected_option_id: normalizedOptionId,
        answer_text: normalizedText,
        is_correct: isCorrect,
        points_awarded: awardedPoints,
        attempt_score: score
      }
    });
  } catch (error) {
    console.error('Error saving answer:', error);
    return res.status(500).json({ success: false, error: 'Failed to save answer' });
  }
}

async function submitQuizAttempt(req, res) {
  try {
    const attemptId = parseInt(req.params.attemptId, 10);
    if (Number.isNaN(attemptId)) return res.status(400).json({ success: false, error: 'Invalid attempt id' });

    const attempt = await QuizAttempt.findByPk(attemptId);
    if (!attempt) return res.status(404).json({ success: false, error: 'Attempt not found' });
    if (attempt.user_id !== req.user.user_id && !['admin', 'board'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const quizForAttempt = await Quiz.findByPk(attempt.quiz_id);
    if (!quizForAttempt || !quizAllowsParticipantAttempts(quizForAttempt.status)) {
      return res.status(403).json({
        success: false,
        error: 'This quiz is not open for attempts'
      });
    }

    const score = await computeAttemptScore(attemptId);
    await attempt.update({
      status: 'submitted',
      submitted_at: new Date(),
      score
    });
    return res.status(200).json({ success: true, data: attempt });
  } catch (error) {
    console.error('Error submitting attempt:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit attempt' });
  }
}

module.exports = {
  getQuizById,
  getQuizAttemptByUser,
  createQuizAttempt,
  saveQuizAnswer,
  submitQuizAttempt
};

