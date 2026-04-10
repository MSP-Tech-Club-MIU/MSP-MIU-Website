const express = require('express');
const router = express.Router();
const { authenticateToken, verifyRole } = require('../middlewares/auth');
const {
  runEvaluation,
  submitJudgeScore,
  getEvaluation
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
  '/:submissionId',
  authenticateToken,
  verifyRole('admin', 'board'),
  getEvaluation
);

module.exports = router;
