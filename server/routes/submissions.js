const express = require('express');
const router = express.Router();
const {
    createSubmission,
    getTeamSubmission,
    getCompetitionSubmissions,
    gradeSubmission
} = require('../controllers/submissions');
const { authenticateToken } = require('../middlewares/auth');
const { upload } = require('../middlewares/multer');
const { authorizeJudgingAccess } = require('../middlewares/judgingAuth');

// Create/update submission (authenticated, team members)
router.post('/', authenticateToken, upload.single('file'), createSubmission);

// Get team submission (authenticated — team members or admin/board)
router.get('/competitions/:competitionId/teams/:teamId', authenticateToken, getTeamSubmission);

// Get all submissions for competition (admin/board)
router.get('/competitions/:competitionId', authenticateToken, authorizeJudgingAccess, getCompetitionSubmissions);

// Grade submission (admin/board)
router.put('/:id/grade', authenticateToken, authorizeJudgingAccess, gradeSubmission);

module.exports = router;
