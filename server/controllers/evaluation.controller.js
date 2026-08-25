const {
  Submission,
  Evaluation,
  JudgeScore,
  User,
  Team,
  Competition,
  CompetitionTask
} = require('../models');
const { runEvaluationForSubmission } = require('../services/evaluationRunner');
const {
  meanJudgeScore,
  computeFinalScore,
  normalizeTo100
} = require('../utils/scoreCalculator');
const logger = require('../utils/logger');
const { logAdminAction } = require('../utils/adminNotification');
const { logAuditEvent, logError } = logger;

/** Local DBs may omit `score` / `feedback` on `submissions`; exclude so Sequelize does not SELECT them. */
const submissionAttributesNoScore = { exclude: ['score', 'feedback'] };

function evalLog(message, data) {
  logger.info('[EVALUATION]', { message, ...data, t: new Date().toISOString() });
}

/**
 * POST /api/evaluation/run/:submissionId
 */
const runEvaluation = async (req, res) => {
  const submissionId = parseInt(req.params.submissionId, 10);
  if (Number.isNaN(submissionId)) {
    return res.status(400).json({ success: false, error: 'Invalid submission id' });
  }

  try {
    const submission = await Submission.findByPk(submissionId, {
      attributes: submissionAttributesNoScore,
      include: [{ model: Competition, as: 'competition' }]
    });
    if (!submission) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }
    const mode = submission.competition?.evaluation_mode || 'manual';
    if (mode !== 'auto' && mode !== 'hybrid') {
      return res.status(400).json({
        success: false,
        error: 'Automated evaluation is disabled for this competition'
      });
    }

    evalLog('RUN_START', { submissionId });
    const result = await runEvaluationForSubmission(submissionId, {
      log: (msg, data) => evalLog(msg, { submissionId, ...data })
    });
    evalLog('RUN_SUCCESS', { submissionId, evaluation_id: result.evaluation.evaluation_id });
    logAuditEvent(
      'EVALUATION_RUN_SUCCESS',
      { submissionId, evaluation_id: result.evaluation.evaluation_id },
      req
    );

    await logAdminAction(
      'evaluation_run',
      `Triggered automated evaluation for submission #${submissionId}`,
      req,
      'competition',
      submission.competition_id
    );

    return res.status(200).json({
      success: true,
      message: 'Evaluation completed',
      data: result
    });
  } catch (error) {
    const status = error.statusCode || 500;
    logError('evaluation.run', error, { submissionId }, req);
    evalLog('RUN_FAILED', { submissionId, error: error.message });
    logAuditEvent(
      'EVALUATION_RUN_FAILED',
      { submissionId, error: error.message },
      req
    );
    return res.status(status).json({
      success: false,
      error: error.message || 'Evaluation failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

function validateScoreField(value, name) {
  if (value === undefined || value === null) {
    return `${name} is required`;
  }
  const n = Number(value);
  if (Number.isNaN(n) || n < 0 || n > 100) {
    return `${name} must be a number between 0 and 100`;
  }
  return null;
}

/**
 * POST /api/evaluation/judge/:submissionId
 */
const submitJudgeScore = async (req, res) => {
  const submissionId = parseInt(req.params.submissionId, 10);
  if (Number.isNaN(submissionId)) {
    return res.status(400).json({ success: false, error: 'Invalid submission id' });
  }

  const {
    design_score,
    creativity_score,
    ux_score,
    innovation_score,
    comment
  } = req.body;

  for (const [name, val] of [
    ['design_score', design_score],
    ['creativity_score', creativity_score],
    ['ux_score', ux_score],
    ['innovation_score', innovation_score]
  ]) {
    const err = validateScoreField(val, name);
    if (err) {
      return res.status(400).json({ success: false, error: err });
    }
  }

  try {
    const submission = await Submission.findByPk(submissionId, {
      attributes: submissionAttributesNoScore,
      include: [{ model: Competition, as: 'competition', attributes: ['type', 'evaluation_mode'] }]
    });
    if (!submission) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }
    if (!['project', 'task_quiz'].includes(submission.competition?.type)) {
      return res.status(400).json({
        success: false,
        error: 'Judging is available only for project and task_quiz competitions'
      });
    }
    if (!['manual', 'hybrid'].includes(submission.competition?.evaluation_mode)) {
      return res.status(400).json({
        success: false,
        error: 'Judging is available only when evaluation_mode is manual or hybrid'
      });
    }

    const judgeId = req.user.user_id;
    const [row, created] = await JudgeScore.findOrCreate({
      where: { submission_id: submissionId, judge_id: judgeId },
      defaults: {
        design_score: normalizeTo100(design_score),
        creativity_score: normalizeTo100(creativity_score),
        ux_score: normalizeTo100(ux_score),
        innovation_score: normalizeTo100(innovation_score),
        comment: comment || null
      }
    });

    if (!created) {
      await row.update({
        design_score: normalizeTo100(design_score),
        creativity_score: normalizeTo100(creativity_score),
        ux_score: normalizeTo100(ux_score),
        innovation_score: normalizeTo100(innovation_score),
        comment: comment != null ? comment : row.comment
      });
    }

    const updated = await JudgeScore.findByPk(row.judge_score_id, {
      include: [{ model: User, as: 'judge', attributes: ['user_id', 'full_name', 'email'] }]
    });

    evalLog('JUDGE_SCORE', { submissionId, judgeId, judge_score_id: updated.judge_score_id });
    logAuditEvent(
      'EVALUATION_JUDGE_SCORE',
      { submissionId, judgeId, judge_score_id: updated.judge_score_id },
      req
    );

    await logAdminAction(
      'judge_score_submitted',
      `${created ? 'Submitted' : 'Updated'} judge score for submission #${submissionId}`,
      req,
      'competition',
      submission.competition_id
    );

    return res.status(200).json({
      success: true,
      message: created ? 'Judge score created' : 'Judge score updated',
      data: updated
    });
  } catch (error) {
    logError('evaluation.judge', error, { submissionId }, req);
    return res.status(500).json({
      success: false,
      error: 'Failed to save judge score'
    });
  }
};

/**
 * GET /api/evaluation/:submissionId
 */
const getEvaluation = async (req, res) => {
  const submissionId = parseInt(req.params.submissionId, 10);
  if (Number.isNaN(submissionId)) {
    return res.status(400).json({ success: false, error: 'Invalid submission id' });
  }

  try {
    const submission = await Submission.findByPk(submissionId, {
      attributes: submissionAttributesNoScore,
      include: [
        { model: Evaluation, as: 'evaluation' },
        {
          model: JudgeScore,
          as: 'judgeScores',
          include: [
            { model: User, as: 'judge', attributes: ['user_id', 'full_name', 'email'] }
          ]
        },
        { model: Team, as: 'team', attributes: ['team_id', 'team_name'] }
      ]
    });

    if (!submission) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }
    const competition = await Competition.findByPk(submission.competition_id, {
      attributes: ['type', 'evaluation_mode']
    });
    if (!['project', 'task_quiz'].includes(competition?.type)) {
      return res.status(400).json({
        success: false,
        error: 'Judging is available only for project and task_quiz competitions'
      });
    }
    if (!['manual', 'hybrid'].includes(competition?.evaluation_mode)) {
      return res.status(400).json({
        success: false,
        error: 'Judging is available only when evaluation_mode is manual or hybrid'
      });
    }

    const judgeRows = (submission.judgeScores || []).map((j) => j.toJSON());
    const judgeAvg = meanJudgeScore(judgeRows);
    const autoRaw = submission.evaluation
      ? parseFloat(submission.evaluation.total_auto_score)
      : null;
    const autoScore = Number.isNaN(autoRaw) ? null : autoRaw;
    const finalScore = computeFinalScore(autoScore, judgeAvg);

    return res.status(200).json({
      success: true,
      data: {
        submission: {
          submission_id: submission.submission_id,
          competition_id: submission.competition_id,
          team_id: submission.team_id,
          team: submission.team,
          status: submission.status,
          r2_key: submission.r2_key,
          submitted_at: submission.submitted_at
        },
        evaluation: submission.evaluation,
        judge_scores: judgeRows,
        judge_average: judgeAvg,
        final_score: finalScore,
        scoring_model: {
          final_formula: 'final = (total_auto_score * 0.6) + (judge_average * 0.4) when both exist'
        }
      }
    });
  } catch (error) {
    logError('evaluation.get', error, { submissionId }, req);
    return res.status(500).json({
      success: false,
      error: 'Failed to load evaluation'
    });
  }
};

/**
 * GET /api/evaluation/task-quiz/:competitionId/team/:teamId
 * Returns per-task marks and average for task_quiz + hybrid/auto/manual judging.
 */
const getTaskQuizTeamEvaluation = async (req, res) => {
  const competitionId = parseInt(req.params.competitionId, 10);
  const teamId = parseInt(req.params.teamId, 10);
  if (Number.isNaN(competitionId) || Number.isNaN(teamId)) {
    return res.status(400).json({ success: false, error: 'Invalid competition or team id' });
  }

  try {
    const competition = await Competition.findByPk(competitionId, {
      attributes: ['competition_id', 'title', 'type', 'evaluation_mode']
    });
    if (!competition) {
      return res.status(404).json({ success: false, error: 'Competition not found' });
    }
    if (competition.type !== 'task_quiz') {
      return res.status(400).json({
        success: false,
        error: 'This endpoint is only available for task_quiz competitions'
      });
    }

    const team = await Team.findOne({
      where: { team_id: teamId, competition_id: competitionId },
      attributes: ['team_id', 'team_name']
    });
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found in this competition'
      });
    }

    const tasks = await CompetitionTask.findAll({
      where: { competition_id: competitionId },
      attributes: ['task_id', 'title', 'position'],
      order: [['position', 'ASC'], ['task_id', 'ASC']]
    });

    const submissions = await Submission.findAll({
      where: {
        competition_id: competitionId,
        team_id: teamId
      },
      attributes: submissionAttributesNoScore,
      include: [
        { model: Evaluation, as: 'evaluation' },
        { model: JudgeScore, as: 'judgeScores' }
      ],
      order: [['task_id', 'ASC']]
    });

    const submissionsByTask = new Map();
    for (const submission of submissions) {
      if (submission.task_id != null) {
        submissionsByTask.set(submission.task_id, submission);
      }
    }

    const taskMarks = tasks.map((task) => {
      const submission = submissionsByTask.get(task.task_id) || null;
      if (!submission) {
        return {
          task_id: task.task_id,
          task_title: task.title,
          position: task.position,
          submission_id: null,
          status: 'missing',
          auto_score: null,
          judge_average: null,
          final_score: null
        };
      }

      const judgeRows = (submission.judgeScores || []).map((j) => j.toJSON());
      const judgeAvg = meanJudgeScore(judgeRows);
      const autoRaw = submission.evaluation
        ? parseFloat(submission.evaluation.total_auto_score)
        : null;
      const autoScore = Number.isNaN(autoRaw) ? null : autoRaw;
      const finalScore = computeFinalScore(autoScore, judgeAvg);

      return {
        task_id: task.task_id,
        task_title: task.title,
        position: task.position,
        submission_id: submission.submission_id,
        status: submission.status,
        auto_score: autoScore,
        judge_average: judgeAvg,
        final_score: finalScore
      };
    });

    const scoredTasks = taskMarks.filter((x) => x.final_score != null);
    const averageFinalScore = scoredTasks.length
      ? Math.round(
          (scoredTasks.reduce((acc, row) => acc + row.final_score, 0) / scoredTasks.length) * 100
        ) / 100
      : null;

    return res.status(200).json({
      success: true,
      data: {
        competition: {
          competition_id: competition.competition_id,
          title: competition.title,
          type: competition.type,
          evaluation_mode: competition.evaluation_mode
        },
        team: {
          team_id: team.team_id,
          team_name: team.team_name
        },
        task_marks: taskMarks,
        average_final_score: averageFinalScore
      }
    });
  } catch (error) {
    logError('evaluation.taskQuizTeam', error, { competitionId, teamId }, req);
    return res.status(500).json({
      success: false,
      error: 'Failed to load task quiz team evaluation'
    });
  }
};

/**
 * GET /api/evaluation/my-task-quiz/:competitionId/team/:teamId
 * Competitor-safe view: per-task static analysis mark and average.
 */
const getMyTaskQuizEvaluation = async (req, res) => {
  const competitionId = parseInt(req.params.competitionId, 10);
  const teamId = parseInt(req.params.teamId, 10);
  if (Number.isNaN(competitionId) || Number.isNaN(teamId)) {
    return res.status(400).json({ success: false, error: 'Invalid competition or team id' });
  }

  try {
    const isPrivileged = ['admin', 'board'].includes(req.user.role);
    if (!isPrivileged) {
      const membership = await Submission.sequelize.query(
        `SELECT tm.team_member_id
         FROM team_members tm
         INNER JOIN teams t ON tm.team_id = t.team_id
         WHERE tm.team_id = ? AND tm.user_id = ? AND t.competition_id = ?
         LIMIT 1`,
        {
          replacements: [teamId, req.user.user_id, competitionId],
          type: Submission.sequelize.QueryTypes.SELECT
        }
      );
      if (!membership || membership.length === 0) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const competition = await Competition.findByPk(competitionId, {
      attributes: ['competition_id', 'title', 'type', 'evaluation_mode']
    });
    if (!competition) {
      return res.status(404).json({ success: false, error: 'Competition not found' });
    }
    if (competition.type !== 'task_quiz') {
      return res.status(400).json({
        success: false,
        error: 'This endpoint is only available for task_quiz competitions'
      });
    }

    const team = await Team.findOne({
      where: { team_id: teamId, competition_id: competitionId },
      attributes: ['team_id', 'team_name']
    });
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found in this competition'
      });
    }

    const tasks = await CompetitionTask.findAll({
      where: { competition_id: competitionId },
      attributes: ['task_id', 'title', 'position'],
      order: [['position', 'ASC'], ['task_id', 'ASC']]
    });

    const submissions = await Submission.findAll({
      where: {
        competition_id: competitionId,
        team_id: teamId
      },
      attributes: submissionAttributesNoScore,
      include: [
        { model: Evaluation, as: 'evaluation' },
        { model: JudgeScore, as: 'judgeScores' }
      ],
      order: [['task_id', 'ASC']]
    });

    const submissionsByTask = new Map();
    for (const submission of submissions) {
      if (submission.task_id != null) {
        submissionsByTask.set(submission.task_id, submission);
      }
    }

    const taskMarks = tasks.map((task) => {
      const submission = submissionsByTask.get(task.task_id) || null;
      if (!submission) {
        return {
          task_id: task.task_id,
          task_title: task.title,
          position: task.position,
          submission_id: null,
          status: 'missing',
          static_analysis_score: null,
          judge_average: null,
          final_score: null
        };
      }

      const judgeRows = (submission.judgeScores || []).map((j) => j.toJSON());
      const judgeAverage = meanJudgeScore(judgeRows);
      const autoRaw = submission.evaluation
        ? parseFloat(submission.evaluation.total_auto_score)
        : null;
      const autoScore = Number.isNaN(autoRaw) ? null : autoRaw;
      const finalScore = computeFinalScore(autoScore, judgeAverage);
      return {
        task_id: task.task_id,
        task_title: task.title,
        position: task.position,
        submission_id: submission.submission_id,
        status: submission.status,
        static_analysis_score: autoScore,
        judge_average: judgeAverage,
        final_score: finalScore
      };
    });

    const tasksTotal = taskMarks.length;
    const submittedTasksCount = taskMarks.filter((x) => x.submission_id != null).length;
    const autoEvaluatedTasksCount = taskMarks.filter((x) => x.static_analysis_score != null).length;
    const judgeEvaluatedTasksCount = taskMarks.filter((x) => x.judge_average != null).length;
    const allTasksSubmitted = tasksTotal > 0 && submittedTasksCount === tasksTotal;
    const autoEvaluationCompleted = allTasksSubmitted && autoEvaluatedTasksCount === tasksTotal;
    const judgesEvaluationCompleted = autoEvaluationCompleted && judgeEvaluatedTasksCount === tasksTotal;

    const scoredTasks = taskMarks.filter((x) => x.static_analysis_score != null);
    const averageStaticAnalysisScore = scoredTasks.length
      ? Math.round(
          (scoredTasks.reduce((acc, row) => acc + row.static_analysis_score, 0) / scoredTasks.length) *
            100
        ) / 100
      : null;
    const finalScoredTasks = taskMarks.filter((x) => x.final_score != null);
    const averageFinalScore = judgesEvaluationCompleted && finalScoredTasks.length > 0
      ? Math.round(
          (finalScoredTasks.reduce((acc, row) => acc + row.final_score, 0) / finalScoredTasks.length) *
            100
        ) / 100
      : null;
    const phase = !allTasksSubmitted
      ? 'awaiting_submissions'
      : !autoEvaluationCompleted
        ? 'awaiting_auto_evaluation'
        : !judgesEvaluationCompleted
          ? 'awaiting_judges'
          : 'complete';

    return res.status(200).json({
      success: true,
      data: {
        competition: {
          competition_id: competition.competition_id,
          title: competition.title,
          type: competition.type,
          evaluation_mode: competition.evaluation_mode
        },
        team: {
          team_id: team.team_id,
          team_name: team.team_name
        },
        readiness: {
          tasks_total: tasksTotal,
          submitted_tasks_count: submittedTasksCount,
          auto_evaluated_tasks_count: autoEvaluatedTasksCount,
          judge_evaluated_tasks_count: judgeEvaluatedTasksCount,
          all_tasks_submitted: allTasksSubmitted,
          auto_evaluation_completed: autoEvaluationCompleted,
          judges_evaluation_completed: judgesEvaluationCompleted,
          can_view_marks: autoEvaluationCompleted,
          phase
        },
        task_marks: taskMarks,
        average_static_analysis_score: averageStaticAnalysisScore,
        average_final_score: averageFinalScore
      }
    });
  } catch (error) {
    logError('evaluation.myTaskQuiz', error, { competitionId, teamId }, req);
    return res.status(500).json({
      success: false,
      error: 'Failed to load your task quiz marks'
    });
  }
};

module.exports = {
  runEvaluation,
  submitJudgeScore,
  getEvaluation,
  getTaskQuizTeamEvaluation,
  getMyTaskQuizEvaluation
};
