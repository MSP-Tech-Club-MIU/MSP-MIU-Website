const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getCompetitionAnnouncements,
  getCompetitionAnnouncementById,
  createCompetitionAnnouncement,
  updateCompetitionAnnouncement,
  deleteCompetitionAnnouncement,
  resendCompetitionAnnouncementEmails
} = require('../controllers/competitionAnnouncements.controller');
const { authenticateToken, verifyRole } = require('../middlewares/auth');

// Get all announcements for a competition (public)
router.get('/', getCompetitionAnnouncements);

// Get specific announcement (public)
router.get('/:announcementId', getCompetitionAnnouncementById);

// Create announcement (admin and board only)
router.post('/', authenticateToken, verifyRole('admin', 'board'), createCompetitionAnnouncement);

// Update announcement (admin and board only)
router.put('/:announcementId', authenticateToken, verifyRole('admin', 'board'), updateCompetitionAnnouncement);

// Delete announcement (admin and board only)
router.delete('/:announcementId', authenticateToken, verifyRole('admin', 'board'), deleteCompetitionAnnouncement);

// Resend announcement emails to all competitors (admin and board only)
router.post('/:announcementId/resend-emails', authenticateToken, verifyRole('admin', 'board'), resendCompetitionAnnouncementEmails);

module.exports = router;
