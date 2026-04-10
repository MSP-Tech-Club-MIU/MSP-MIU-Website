const express = require('express');
const router = express.Router();
const {
  getAllCompetitions,
  getCompetitionById,
  createCompetition,
  updateCompetition,
  deleteCompetition,
  getUserTeamForCompetition,
  getCompetitionLeaderboard
} = require('../controllers/competitions');
const { getCompetitionTeams } = require('../controllers/teams');
const { authenticateToken, verifyRole } = require('../middlewares/auth');

// Get all competitions (public - shows only open/finished; admin/board sees all)
router.get('/', getAllCompetitions);

// Leaderboard (public)
router.get('/:id/leaderboard', getCompetitionLeaderboard);

// Get competition by ID (public)
router.get('/:id', getCompetitionById);

// Get teams for a competition (public)
router.get('/:competitionId/teams', getCompetitionTeams);

// Get user's team for a specific competition (authenticated)
router.get('/:id/my-team', authenticateToken, getUserTeamForCompetition);

// Create competition (admin and board only)
router.post('/', authenticateToken, verifyRole('admin', 'board'), createCompetition);

// Update competition (admin and board only)
router.put('/:id', authenticateToken, verifyRole('admin', 'board'), updateCompetition);

// Delete competition (admin only)
router.delete('/:id', authenticateToken, verifyRole('admin'), deleteCompetition);

module.exports = router;
