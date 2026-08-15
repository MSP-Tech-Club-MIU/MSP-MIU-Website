const { Op } = require('sequelize');
const {
  Competition,
  Quiz,
  QuizQuestion,
  QuizOption,
  sequelize
} = require('../models');
const { ensureQuizForCompetition } = require('../utils/ensureQuizForCompetition');
const { cairoLocalInputToUtc } = require('../utils/cairoQuizTime');
const logger = require('../utils/logger');

const QUIZ_STATUSES = ['draft', 'published', 'active', 'closed'];

function num(v, fallback = 0) {
  if (v == null) return fallback;
  if (typeof v === 'bigint') return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function loadQuizForAdminCompetition(competitionId, adminUserId) {
  const cid = parseInt(competitionId, 10);
  if (Number.isNaN(cid)) {
    return { error: 'Invalid competition id', status: 400 };
  }
  const competition = await Competition.findByPk(cid);
  if (!competition) {
    return { error: 'Competition not found', status: 404 };
  }
  if (!['quiz', 'task_quiz'].includes(competition.type)) {
    return { error: 'Competition is not a quiz or task quiz type', status: 400 };
  }
  let quiz = await Quiz.findOne({ where: { competition_id: cid } });
  if (!quiz) {
    await ensureQuizForCompetition(competition.get({ plain: true }), adminUserId);
    quiz = await Quiz.findOne({ where: { competition_id: cid } });
  }
  if (!quiz) {
    return { error: 'Quiz not found', status: 404 };
  }
  return { competition, quiz };
}

async function findQuestionForAdmin(questionId) {
  const qid = parseInt(questionId, 10);
  if (Number.isNaN(qid)) return null;
  const question = await QuizQuestion.findByPk(qid);
  if (!question) return null;
  const quiz = await Quiz.findByPk(question.quiz_id);
  if (!quiz) return null;
  const competition = await Competition.findByPk(quiz.competition_id);
  if (!competition || competition.type !== 'quiz') return null;
  return { question, quiz, competition };
}

async function findOptionForAdmin(optionId) {
  const oid = parseInt(optionId, 10);
  if (Number.isNaN(oid)) return null;
  const option = await QuizOption.findByPk(oid);
  if (!option) return null;
  const ctx = await findQuestionForAdmin(option.question_id);
  if (!ctx) return null;
  return { option, ...ctx };
}

function formatAdminQuizPayload(quiz, questions, optionsByQuestion) {
  return {
    quiz_id: num(quiz.quiz_id),
    competition_id: num(quiz.competition_id),
    title: quiz.title,
    description: quiz.description,
    start_at: quiz.start_at,
    end_at: quiz.end_at,
    time_limit_minutes:
      quiz.time_limit_minutes != null && Number(quiz.time_limit_minutes) > 0
        ? num(quiz.time_limit_minutes, 0)
        : null,
    display_timezone: 'Africa/Cairo',
    status: quiz.status,
    questions: questions.map((q) => ({
      question_id: num(q.question_id),
      quiz_id: num(q.quiz_id),
      question_type: q.question_type,
      question_text: q.question_text,
      points: q.points != null ? num(q.points, 0) : 0,
      position: num(q.position, 0),
      options: (optionsByQuestion.get(num(q.question_id, 0)) || []).map((o) => ({
        option_id: num(o.option_id),
        question_id: num(o.question_id),
        option_text: o.option_text,
        is_correct: !!o.is_correct,
        position: num(o.position, 0)
      }))
    }))
  };
}

async function getAdminQuiz(req, res) {
  try {
    const loaded = await loadQuizForAdminCompetition(req.params.id, req.user.user_id);
    if (loaded.error) {
      return res.status(loaded.status).json({ success: false, error: loaded.error });
    }
    const { quiz } = loaded;

    const questions = await QuizQuestion.findAll({
      where: { quiz_id: quiz.quiz_id },
      order: [['position', 'ASC']]
    });
    const questionIds = questions.map((q) => q.question_id).filter((id) => id != null);
    const options =
      questionIds.length > 0
        ? await QuizOption.findAll({
            where: { question_id: { [Op.in]: questionIds } },
            order: [['position', 'ASC']]
          })
        : [];

    const byQuestion = new Map();
    options.forEach((o) => {
      const key = num(o.question_id, 0);
      if (!byQuestion.has(key)) byQuestion.set(key, []);
      byQuestion.get(key).push(o);
    });

    return res.status(200).json({
      success: true,
      data: formatAdminQuizPayload(quiz, questions, byQuestion)
    });
  } catch (err) {
    logger.error('getAdminQuiz:', err);
    return res.status(500).json({ success: false, error: 'Failed to load quiz' });
  }
}

async function patchAdminQuiz(req, res) {
  try {
    const loaded = await loadQuizForAdminCompetition(req.params.id, req.user.user_id);
    if (loaded.error) {
      return res.status(loaded.status).json({ success: false, error: loaded.error });
    }
    const { quiz } = loaded;
    const body = req.body || {};
    const { status } = body;

    if (status !== undefined) {
      if (!QUIZ_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `status must be one of: ${QUIZ_STATUSES.join(', ')}`
        });
      }
      // Raw UPDATE avoids Sequelize model/hook issues and matches DB ENUM exactly.
      // If production DB still has an old ENUM (e.g. only 'draft'), MySQL errors here — return 400 + hint.
      try {
        await sequelize.query(
          'UPDATE quizzes SET status = ? WHERE quiz_id = ?',
          { replacements: [status, quiz.quiz_id] }
        );
      } catch (sqlErr) {
        const sqlMsg = sqlErr?.parent?.sqlMessage || sqlErr?.message || '';
        logger.error('patchAdminQuiz SQL:', sqlErr, { sqlMsg });
        const enumHint =
          /Data truncated|Incorrect|ENUM|invalid/i.test(sqlMsg) ||
          sqlErr?.name === 'SequelizeDatabaseError';
        return res.status(enumHint ? 400 : 500).json({
          success: false,
          error: enumHint
            ? `Cannot save quiz status "${status}". The database column quizzes.status may use an older ENUM. Run the migration in server/scripts/alter-quizzes-status-enum.sql (or equivalent) to include: ${QUIZ_STATUSES.join(', ')}.`
            : 'Failed to update quiz status',
          details:
            process.env.NODE_ENV === 'development' || process.env.QUIZ_DEBUG === '1'
              ? sqlMsg
              : undefined
        });
      }
    }

    const quizBase = await Quiz.findByPk(quiz.quiz_id);
    if (!quizBase) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    const scheduleUpdates = {};
    if (body.start_at_cairo != null && body.end_at_cairo != null) {
      try {
        scheduleUpdates.start_at = cairoLocalInputToUtc(body.start_at_cairo);
        scheduleUpdates.end_at = cairoLocalInputToUtc(body.end_at_cairo);
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: e.message || 'Invalid Cairo start/end datetime'
        });
      }
    } else {
      if (body.start_at !== undefined) {
        scheduleUpdates.start_at = new Date(body.start_at);
      }
      if (body.end_at !== undefined) {
        scheduleUpdates.end_at = new Date(body.end_at);
      }
    }

    if (body.time_limit_minutes !== undefined) {
      if (body.time_limit_minutes === null || body.time_limit_minutes === '') {
        scheduleUpdates.time_limit_minutes = null;
      } else {
        const tl = parseInt(body.time_limit_minutes, 10);
        if (!Number.isFinite(tl) || tl <= 0) {
          return res.status(400).json({
            success: false,
            error: 'time_limit_minutes must be a positive integer, or empty/null to clear'
          });
        }
        scheduleUpdates.time_limit_minutes = tl;
      }
    }

    if (Object.keys(scheduleUpdates).length > 0) {
      const mergedStart = scheduleUpdates.start_at ?? quizBase.start_at;
      const mergedEnd = scheduleUpdates.end_at ?? quizBase.end_at;
      if (!(new Date(mergedEnd) > new Date(mergedStart))) {
        return res.status(400).json({
          success: false,
          error: 'Quiz end must be after start'
        });
      }
      await Quiz.update(scheduleUpdates, { where: { quiz_id: quiz.quiz_id } });
    }

    const quizFresh = await Quiz.findByPk(quiz.quiz_id);
    if (!quizFresh) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }
    const questions = await QuizQuestion.findAll({
      where: { quiz_id: quizFresh.quiz_id },
      order: [['position', 'ASC']]
    });
    const questionIds = questions.map((q) => q.question_id);
    const options =
      questionIds.length > 0
        ? await QuizOption.findAll({
            where: { question_id: { [Op.in]: questionIds } },
            order: [['position', 'ASC']]
          })
        : [];
    const byQuestion = new Map();
    options.forEach((o) => {
      const key = num(o.question_id, 0);
      if (!byQuestion.has(key)) byQuestion.set(key, []);
      byQuestion.get(key).push(o);
    });

    return res.status(200).json({
      success: true,
      data: formatAdminQuizPayload(quizFresh, questions, byQuestion)
    });
  } catch (err) {
    logger.error('patchAdminQuiz:', err);
    const expose =
      process.env.NODE_ENV === 'development' || process.env.QUIZ_DEBUG === '1';
    const sqlMsg = err?.parent?.sqlMessage || err?.message;
    return res.status(500).json({
      success: false,
      error: 'Failed to update quiz',
      details: expose ? sqlMsg : undefined
    });
  }
}

async function postAdminQuizQuestion(req, res) {
  try {
    const loaded = await loadQuizForAdminCompetition(req.params.id, req.user.user_id);
    if (loaded.error) {
      return res.status(loaded.status).json({ success: false, error: loaded.error });
    }
    const { competition, quiz } = loaded;
    if (competition.type !== 'quiz') {
      return res.status(400).json({
        success: false,
        error: 'Quiz questions can only be managed for quiz-type competitions, not task quizzes.'
      });
    }
    const { question_type, question_text, points, position } = req.body || {};

    if (!question_type || !['mcq', 'text'].includes(question_type)) {
      return res.status(400).json({ success: false, error: 'question_type must be mcq or text' });
    }
    if (!question_text || !String(question_text).trim()) {
      return res.status(400).json({ success: false, error: 'question_text is required' });
    }

    let pos = position != null ? parseInt(position, 10) : null;
    if (pos == null || Number.isNaN(pos)) {
      const maxRow = await QuizQuestion.findOne({
        where: { quiz_id: quiz.quiz_id },
        order: [['position', 'DESC']],
        attributes: ['position']
      });
      pos = (maxRow?.position || 0) + 1;
    }

    const pts = points != null ? Number(points) : 1;
    if (!Number.isFinite(pts) || pts < 0) {
      return res.status(400).json({ success: false, error: 'points must be a non-negative number' });
    }

    await QuizQuestion.create({
      quiz_id: quiz.quiz_id,
      question_type,
      question_text: String(question_text).trim(),
      points: pts,
      position: pos
    });

    const questions = await QuizQuestion.findAll({
      where: { quiz_id: quiz.quiz_id },
      order: [['position', 'ASC']]
    });
    const questionIds = questions.map((q) => q.question_id);
    const options = await QuizOption.findAll({
      where: { question_id: { [Op.in]: questionIds } },
      order: [['position', 'ASC']]
    });
    const byQuestion = new Map();
    options.forEach((o) => {
      const key = num(o.question_id, 0);
      if (!byQuestion.has(key)) byQuestion.set(key, []);
      byQuestion.get(key).push(o);
    });

    return res.status(201).json({
      success: true,
      data: formatAdminQuizPayload(quiz, questions, byQuestion)
    });
  } catch (err) {
    logger.error('postAdminQuizQuestion:', err);
    return res.status(500).json({ success: false, error: 'Failed to create question' });
  }
}

async function putAdminQuizQuestion(req, res) {
  try {
    const ctx = await findQuestionForAdmin(req.params.questionId);
    if (!ctx) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    const { question, quiz } = ctx;
    const { question_type, question_text, points, position } = req.body || {};

    const updates = {};
    if (question_type !== undefined) {
      if (!['mcq', 'text'].includes(question_type)) {
        return res.status(400).json({ success: false, error: 'question_type must be mcq or text' });
      }
      updates.question_type = question_type;
    }
    if (question_text !== undefined) {
      if (!String(question_text).trim()) {
        return res.status(400).json({ success: false, error: 'question_text cannot be empty' });
      }
      updates.question_text = String(question_text).trim();
    }
    if (points !== undefined) {
      const pts = Number(points);
      if (!Number.isFinite(pts) || pts < 0) {
        return res.status(400).json({ success: false, error: 'points must be a non-negative number' });
      }
      updates.points = pts;
    }
    if (position !== undefined) {
      const pos = parseInt(position, 10);
      if (Number.isNaN(pos)) {
        return res.status(400).json({ success: false, error: 'position must be an integer' });
      }
      updates.position = pos;
    }

    if (Object.keys(updates).length > 0) {
      await question.update(updates);
    }

    const questions = await QuizQuestion.findAll({
      where: { quiz_id: quiz.quiz_id },
      order: [['position', 'ASC']]
    });
    const questionIds = questions.map((q) => q.question_id);
    const options = await QuizOption.findAll({
      where: { question_id: { [Op.in]: questionIds } },
      order: [['position', 'ASC']]
    });
    const byQuestion = new Map();
    options.forEach((o) => {
      const key = num(o.question_id, 0);
      if (!byQuestion.has(key)) byQuestion.set(key, []);
      byQuestion.get(key).push(o);
    });

    return res.status(200).json({
      success: true,
      data: formatAdminQuizPayload(quiz, questions, byQuestion)
    });
  } catch (err) {
    logger.error('putAdminQuizQuestion:', err);
    return res.status(500).json({ success: false, error: 'Failed to update question' });
  }
}

async function deleteAdminQuizQuestion(req, res) {
  try {
    const ctx = await findQuestionForAdmin(req.params.questionId);
    if (!ctx) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    const { question, quiz } = ctx;
    await question.destroy();

    const questions = await QuizQuestion.findAll({
      where: { quiz_id: quiz.quiz_id },
      order: [['position', 'ASC']]
    });
    const questionIds = questions.map((q) => q.question_id);
    const options =
      questionIds.length > 0
        ? await QuizOption.findAll({
            where: { question_id: { [Op.in]: questionIds } },
            order: [['position', 'ASC']]
          })
        : [];
    const byQuestion = new Map();
    options.forEach((o) => {
      const key = num(o.question_id, 0);
      if (!byQuestion.has(key)) byQuestion.set(key, []);
      byQuestion.get(key).push(o);
    });

    return res.status(200).json({
      success: true,
      data: formatAdminQuizPayload(quiz, questions, byQuestion)
    });
  } catch (err) {
    logger.error('deleteAdminQuizQuestion:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete question' });
  }
}

async function enforceSingleCorrectMcq(questionId, correctOptionId, transaction) {
  await QuizOption.update(
    { is_correct: false },
    { where: { question_id: questionId }, transaction }
  );
  await QuizOption.update(
    { is_correct: true },
    { where: { option_id: correctOptionId, question_id: questionId }, transaction }
  );
}

async function postAdminQuizOption(req, res) {
  try {
    const ctx = await findQuestionForAdmin(req.params.questionId);
    if (!ctx) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    const { question, quiz } = ctx;
    const { option_text, is_correct, position } = req.body || {};

    if (!option_text || !String(option_text).trim()) {
      return res.status(400).json({ success: false, error: 'option_text is required' });
    }

    let pos = position != null ? parseInt(position, 10) : null;
    if (pos == null || Number.isNaN(pos)) {
      const maxRow = await QuizOption.findOne({
        where: { question_id: question.question_id },
        order: [['position', 'DESC']],
        attributes: ['position']
      });
      pos = (maxRow?.position || 0) + 1;
    }

    const markCorrect = !!is_correct;

    if (question.question_type === 'mcq' && markCorrect) {
      const created = await sequelize.transaction(async (t) => {
        const opt = await QuizOption.create(
          {
            question_id: question.question_id,
            option_text: String(option_text).trim(),
            is_correct: false,
            position: pos
          },
          { transaction: t }
        );
        await enforceSingleCorrectMcq(question.question_id, opt.option_id, t);
        return opt;
      });
      await created.reload();
    } else if (question.question_type === 'text' && markCorrect) {
      const created = await sequelize.transaction(async (t) => {
        await QuizOption.update(
          { is_correct: false },
          { where: { question_id: question.question_id }, transaction: t }
        );
        return QuizOption.create(
          {
            question_id: question.question_id,
            option_text: String(option_text).trim(),
            is_correct: true,
            position: pos
          },
          { transaction: t }
        );
      });
      await created.reload();
    } else {
      if (question.question_type === 'text' && !markCorrect) {
        const existingCorrect = await QuizOption.findOne({
          where: { question_id: question.question_id, is_correct: true }
        });
        if (!existingCorrect) {
          // allow distractor-less text: optional wrong options not used for grading
        }
      }
      await QuizOption.create({
        question_id: question.question_id,
        option_text: String(option_text).trim(),
        is_correct: markCorrect,
        position: pos
      });
    }

    const questions = await QuizQuestion.findAll({
      where: { quiz_id: quiz.quiz_id },
      order: [['position', 'ASC']]
    });
    const questionIds = questions.map((q) => q.question_id);
    const options = await QuizOption.findAll({
      where: { question_id: { [Op.in]: questionIds } },
      order: [['position', 'ASC']]
    });
    const byQuestion = new Map();
    options.forEach((o) => {
      const key = num(o.question_id, 0);
      if (!byQuestion.has(key)) byQuestion.set(key, []);
      byQuestion.get(key).push(o);
    });

    return res.status(201).json({
      success: true,
      data: formatAdminQuizPayload(quiz, questions, byQuestion)
    });
  } catch (err) {
    logger.error('postAdminQuizOption:', err);
    return res.status(500).json({ success: false, error: 'Failed to create option' });
  }
}

async function putAdminQuizOption(req, res) {
  try {
    const ctx = await findOptionForAdmin(req.params.optionId);
    if (!ctx) {
      return res.status(404).json({ success: false, error: 'Option not found' });
    }
    const { option, question, quiz } = ctx;
    const { option_text, is_correct, position } = req.body || {};

    const updates = {};
    if (option_text !== undefined) {
      if (!String(option_text).trim()) {
        return res.status(400).json({ success: false, error: 'option_text cannot be empty' });
      }
      updates.option_text = String(option_text).trim();
    }
    if (position !== undefined) {
      const pos = parseInt(position, 10);
      if (Number.isNaN(pos)) {
        return res.status(400).json({ success: false, error: 'position must be an integer' });
      }
      updates.position = pos;
    }

    if (is_correct !== undefined) {
      const markCorrect = !!is_correct;
      if (question.question_type === 'mcq') {
        if (markCorrect) {
          await sequelize.transaction(async (t) => {
            if (Object.keys(updates).length > 0) {
              await option.update(updates, { transaction: t });
            }
            await enforceSingleCorrectMcq(question.question_id, option.option_id, t);
          });
        } else {
          await option.update({ ...updates, is_correct: false });
        }
      } else {
        // text
        if (markCorrect) {
          await sequelize.transaction(async (t) => {
            await QuizOption.update(
              { is_correct: false },
              { where: { question_id: question.question_id }, transaction: t }
            );
            await option.update({ ...updates, is_correct: true }, { transaction: t });
          });
        } else {
          await option.update({ ...updates, is_correct: false });
        }
      }
    } else if (Object.keys(updates).length > 0) {
      await option.update(updates);
    }

    const questions = await QuizQuestion.findAll({
      where: { quiz_id: quiz.quiz_id },
      order: [['position', 'ASC']]
    });
    const questionIds = questions.map((q) => q.question_id);
    const options = await QuizOption.findAll({
      where: { question_id: { [Op.in]: questionIds } },
      order: [['position', 'ASC']]
    });
    const byQuestion = new Map();
    options.forEach((o) => {
      const key = num(o.question_id, 0);
      if (!byQuestion.has(key)) byQuestion.set(key, []);
      byQuestion.get(key).push(o);
    });

    return res.status(200).json({
      success: true,
      data: formatAdminQuizPayload(quiz, questions, byQuestion)
    });
  } catch (err) {
    logger.error('putAdminQuizOption:', err);
    return res.status(500).json({ success: false, error: 'Failed to update option' });
  }
}

async function deleteAdminQuizOption(req, res) {
  try {
    const ctx = await findOptionForAdmin(req.params.optionId);
    if (!ctx) {
      return res.status(404).json({ success: false, error: 'Option not found' });
    }
    const { option, quiz } = ctx;
    await option.destroy();

    const questions = await QuizQuestion.findAll({
      where: { quiz_id: quiz.quiz_id },
      order: [['position', 'ASC']]
    });
    const questionIds = questions.map((q) => q.question_id);
    const options =
      questionIds.length > 0
        ? await QuizOption.findAll({
            where: { question_id: { [Op.in]: questionIds } },
            order: [['position', 'ASC']]
          })
        : [];
    const byQuestion = new Map();
    options.forEach((o) => {
      const key = num(o.question_id, 0);
      if (!byQuestion.has(key)) byQuestion.set(key, []);
      byQuestion.get(key).push(o);
    });

    return res.status(200).json({
      success: true,
      data: formatAdminQuizPayload(quiz, questions, byQuestion)
    });
  } catch (err) {
    logger.error('deleteAdminQuizOption:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete option' });
  }
}

module.exports = {
  getAdminQuiz,
  patchAdminQuiz,
  postAdminQuizQuestion,
  putAdminQuizQuestion,
  deleteAdminQuizQuestion,
  postAdminQuizOption,
  putAdminQuizOption,
  deleteAdminQuizOption
};
