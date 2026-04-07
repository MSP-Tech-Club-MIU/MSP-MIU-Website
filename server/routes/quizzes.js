const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  getQuizById,
  getQuizAttemptByUser
} = require('../controllers/quiz.controller');

router.get('/:id', authenticateToken, getQuizById);
router.get('/:quizId/attempts/:userId', authenticateToken, getQuizAttemptByUser);

module.exports = router;

