const { Submission, Evaluation, JudgeScore, User, Team } = require('../models');
const { runEvaluationForSubmission } = require('../services/evaluationRunner');
const {
  meanJudgeScore,
  computeFinalScore,
  normalizeTo100
} = require('../utils/scoreCalculator');
const { logAuditEvent, logError } = require('../utils/logger');

function evalLog(message, data) {
  console.log(
    '[EVALUATION]',
    JSON.stringify({ message, ...data, t: new Date().toISOString() })
  );
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
    const submission = await Submission.findByPk(submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
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

module.exports = {
  runEvaluation,
  submitJudgeScore,
  getEvaluation
};
