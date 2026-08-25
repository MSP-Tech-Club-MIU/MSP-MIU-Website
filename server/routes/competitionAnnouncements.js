const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getCompetitionAnnouncements,
  getCompetitionAnnouncementById,
  createCompetitionAnnouncement,
  approveCompetitionAnnouncement,
  rejectCompetitionAnnouncement,
  updateCompetitionAnnouncement,
  deleteCompetitionAnnouncement,
  resendCompetitionAnnouncementEmails
} = require('../controllers/competitionAnnouncements.controller');
const { authenticateToken, verifyRole } = require('../middlewares/auth');
const { presidentOrVicePresidentAuth } = require('../middlewares/adminAuth');

// Get all announcements for a competition (public sees active and approved, admin sees all)
router.get('/', getCompetitionAnnouncements);

// Get specific announcement (public)
router.get('/:announcementId', getCompetitionAnnouncementById);

// Create announcement (admin and board only; broadcasts queued if non-President/VP)
router.post('/', authenticateToken, verifyRole('admin', 'board'), createCompetitionAnnouncement);

// Approve competition announcement & dispatch emails (President/VP only)
router.put('/:announcementId/approve', authenticateToken, presidentOrVicePresidentAuth, approveCompetitionAnnouncement);

// Refuse competition announcement email broadcast (President/VP only)
router.put('/:announcementId/reject', authenticateToken, presidentOrVicePresidentAuth, rejectCompetitionAnnouncement);

// Update announcement (admin and board only)
router.put('/:announcementId', authenticateToken, verifyRole('admin', 'board'), updateCompetitionAnnouncement);

// Delete announcement (admin and board only)
router.delete('/:announcementId', authenticateToken, verifyRole('admin', 'board'), deleteCompetitionAnnouncement);

// Resend announcement emails to all competitors (admin and board only)
router.post('/:announcementId/resend-emails', authenticateToken, verifyRole('admin', 'board'), resendCompetitionAnnouncementEmails);

module.exports = router;
