const express = require('express');
const router = express.Router();
const {
  getAllAnnouncements,
  getAnnouncementById,
  addAnnouncement,
  approveAnnouncement,
  rejectAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementEmailJobStatus,
  resendAnnouncementEmails
} = require('../controllers/announcements');
const { authenticateToken, verifyRole } = require('../middlewares/auth');
const { presidentOrVicePresidentAuth } = require('../middlewares/adminAuth');

// Get all announcements (public - only active and approved ones by default)
router.get('/', getAllAnnouncements);

// Email broadcast job progress (must be before /:id)
router.get(
  '/email-jobs/:jobId',
  authenticateToken,
  verifyRole('admin', 'board'),
  getAnnouncementEmailJobStatus
);

// Get announcement by ID (public)
router.get('/:id', getAnnouncementById);

// Create announcement (admin/board only; email broadcasts queued if non-President/VP)
router.post('/', authenticateToken, verifyRole('admin', 'board'), addAnnouncement);

// Approve announcement & dispatch email broadcast (President/VP only)
router.put('/:id/approve', authenticateToken, presidentOrVicePresidentAuth, approveAnnouncement);

// Refuse announcement email broadcast (President/VP only)
router.put('/:id/reject', authenticateToken, presidentOrVicePresidentAuth, rejectAnnouncement);

// Resend announcement emails (President/VP only)
router.post('/:id/resend-emails', authenticateToken, presidentOrVicePresidentAuth, resendAnnouncementEmails);

// Update announcement (admin/board only)
router.put('/:id', authenticateToken, verifyRole('admin', 'board'), updateAnnouncement);

// Delete announcement (admin/board only)
router.delete('/:id', authenticateToken, verifyRole('admin', 'board'), deleteAnnouncement);

module.exports = router;

