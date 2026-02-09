const express = require('express');
const router = express.Router();
const {
    createTeam,
    getTeamById,
    getCompetitionTeams,
    inviteToTeam,
    acceptInvitation,
    declineInvitation,
    verifyInvitation,
    acceptInvitationNewUser
} = require('../controllers/teams');
const { authenticateToken } = require('../middlewares/auth');

// Create team (public - no auth required for guests to create teams)
router.post('/', createTeam);

// Get team by ID (public - anyone can view team details)
router.get('/:id', getTeamById);

// Send invitation (authenticated, leader only)
router.post('/:id/invite', authenticateToken, inviteToTeam);

// Verify invitation token (public - no auth required)
router.get('/verify-invitation', verifyInvitation);

// Accept invitation for new user - creates account with password (public - no auth required)
router.post('/accept-invitation-new-user', acceptInvitationNewUser);

// Accept invitation for existing user (authenticated)
router.post('/accept-invitation', authenticateToken, acceptInvitation);
// Decline invitation (authenticated)
router.post('/invitations/:token/decline', authenticateToken, declineInvitation);

module.exports = router;