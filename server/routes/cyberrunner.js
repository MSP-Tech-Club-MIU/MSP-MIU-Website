const express = require('express');
const router = express.Router();
const {
  getLeaderboard,
  submitScore,
  getDailyChampion,
  getAdminScores,
  deleteScore
} = require('../controllers/cyberrunner.controller');
const { optionalAuth, authenticateToken, verifyRole } = require('../middlewares/auth');

// Public routes
router.get('/leaderboard', getLeaderboard);
router.get('/daily-champion', getDailyChampion);
router.post('/score', optionalAuth, submitScore);

// Admin routes (board / admin only)
router.get('/admin/scores', authenticateToken, verifyRole('admin', 'board'), getAdminScores);
router.delete('/admin/scores/:id', authenticateToken, verifyRole('admin', 'board'), deleteScore);

module.exports = router;
