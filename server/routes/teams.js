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
const { authenticateToken, optionalAuth } = require('../middlewares/auth');

// Create team: optional JWT — guests create without auth; logged-in users must send Bearer so req.user is set
router.post('/', optionalAuth, createTeam);

// Static paths MUST be registered before `/:id` or Express will treat e.g. "verify-invitation" as a team id.
router.get('/verify-invitation', verifyInvitation);
router.post('/accept-invitation-new-user', acceptInvitationNewUser);
router.post('/accept-invitation', authenticateToken, acceptInvitation);
router.post('/invitations/:token/accept', authenticateToken, acceptInvitation);
router.post('/invitations/:token/decline', authenticateToken, declineInvitation);
router.post('/decline-invitation', authenticateToken, declineInvitation);

// Get team by ID (authenticated — team members or admin/board)
router.get('/:id', authenticateToken, getTeamById);

// Send invitation (authenticated, leader only)
router.post('/:id/invite', authenticateToken, inviteToTeam);

module.exports = router;