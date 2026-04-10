const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  getQuizById,
  getQuizAttemptByUser
} = require('../controllers/quiz.controller');

// More specific path first so it is not captured by /:id
router.get('/:quizId/attempts/:userId', authenticateToken, getQuizAttemptByUser);
router.get('/:id', authenticateToken, getQuizById);

module.exports = router;

