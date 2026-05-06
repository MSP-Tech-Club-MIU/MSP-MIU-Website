const express = require('express');
const router = express.Router();
const { authenticateToken, verifyRole } = require('../middlewares/auth');
const { authorizeJudgingAccess } = require('../middlewares/judgingAuth');
const {
  runEvaluation,
  submitJudgeScore,
  getEvaluation,
  getTaskQuizTeamEvaluation,
  getMyTaskQuizEvaluation
} = require('../controllers/evaluation.controller');

router.post(
  '/run/:submissionId',
  authenticateToken,
  verifyRole('admin', 'board'),
  runEvaluation
);

router.post(
  '/judge/:submissionId',
  authenticateToken,
  authorizeJudgingAccess,
  submitJudgeScore
);

router.get(
  '/task-quiz/:competitionId/team/:teamId',
  authenticateToken,
  authorizeJudgingAccess,
  getTaskQuizTeamEvaluation
);

router.get(
  '/my-task-quiz/:competitionId/team/:teamId',
  authenticateToken,
  getMyTaskQuizEvaluation
);

router.get(
  '/:submissionId',
  authenticateToken,
  authorizeJudgingAccess,
  getEvaluation
);

module.exports = router;
