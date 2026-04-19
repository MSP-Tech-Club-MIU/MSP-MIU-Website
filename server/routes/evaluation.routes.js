const express = require('express');
const router = express.Router();
const { authenticateToken, verifyRole } = require('../middlewares/auth');
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
  verifyRole('admin', 'board'),
  submitJudgeScore
);

router.get(
  '/task-quiz/:competitionId/team/:teamId',
  authenticateToken,
  verifyRole('admin', 'board'),
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
  verifyRole('admin', 'board'),
  getEvaluation
);

module.exports = router;
