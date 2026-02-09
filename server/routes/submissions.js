const express = require('express');
const router = express.Router();
const {
    createSubmission,
    getTeamSubmission,
    getCompetitionSubmissions,
    gradeSubmission
} = require('../controllers/submissions');
const { authenticateToken, verifyRole } = require('../middlewares/auth');
const { upload } = require('../middlewares/multer');

// Create/update submission (authenticated, team members)
router.post('/', authenticateToken, upload.single('file'), createSubmission);

// Get team submission (authenticated)
router.get('/competitions/:competitionId/teams/:teamId', authenticateToken, getTeamSubmission);

// Get all submissions for competition (admin/board)
router.get('/competitions/:competitionId', authenticateToken, verifyRole('admin', 'board'), getCompetitionSubmissions);

// Grade submission (admin/board)
router.put('/:id/grade', authenticateToken, verifyRole('admin', 'board'), gradeSubmission);

module.exports = router;
