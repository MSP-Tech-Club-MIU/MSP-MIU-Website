const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getCourseAnnouncements,
  getCourseAnnouncementById,
  getCourseRecipientsPreview,
  createCourseAnnouncement,
  approveCourseAnnouncement,
  rejectCourseAnnouncement,
  sendDirectCourseMemberMessage,
  updateCourseAnnouncement,
  deleteCourseAnnouncement,
  resendCourseAnnouncementEmails
} = require('../controllers/courseAnnouncements.controller');
const { authenticateToken, verifyRole } = require('../middlewares/auth');
const { presidentOrVicePresidentAuth } = require('../middlewares/adminAuth');

const admin = [authenticateToken, verifyRole('admin', 'board')];

// Preview recipient count (admin/board)
router.get('/recipients-preview', ...admin, getCourseRecipientsPreview);
router.post('/recipients-preview', ...admin, getCourseRecipientsPreview);

// Send direct message/email to a specific course member (admin/board)
router.post('/message-member', ...admin, sendDirectCourseMemberMessage);

// Get all announcements for a course (public sees active and approved, admin sees all)
router.get('/', getCourseAnnouncements);

// Get specific course announcement (public)
router.get('/:announcementId', getCourseAnnouncementById);

// Create announcement and optionally broadcast emails (admin/board; broadcasts queued if non-President/VP)
router.post('/', ...admin, createCourseAnnouncement);

// Approve course announcement & dispatch emails (President/VP only)
router.put('/:announcementId/approve', authenticateToken, presidentOrVicePresidentAuth, approveCourseAnnouncement);

// Refuse course announcement email broadcast (President/VP only)
router.put('/:announcementId/reject', authenticateToken, presidentOrVicePresidentAuth, rejectCourseAnnouncement);

// Update announcement (admin/board)
router.put('/:announcementId', ...admin, updateCourseAnnouncement);

// Delete announcement (admin/board)
router.delete('/:announcementId', ...admin, deleteCourseAnnouncement);

// Resend announcement emails to targeted course members (admin/board)
router.post('/:announcementId/resend-emails', ...admin, resendCourseAnnouncementEmails);

module.exports = router;
