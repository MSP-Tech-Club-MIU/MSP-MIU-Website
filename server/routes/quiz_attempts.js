const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  createQuizAttempt,
  saveQuizAnswer,
  submitQuizAttempt
} = require('../controllers/quiz.controller');

router.post('/', authenticateToken, createQuizAttempt);
router.post('/:attemptId/answers', authenticateToken, saveQuizAnswer);
router.patch('/:attemptId', authenticateToken, submitQuizAttempt);

module.exports = router;

