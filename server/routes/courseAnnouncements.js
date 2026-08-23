const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getCourseAnnouncements,
  getCourseAnnouncementById,
  getCourseRecipientsPreview,
  createCourseAnnouncement,
  sendDirectCourseMemberMessage,
  updateCourseAnnouncement,
  deleteCourseAnnouncement,
  resendCourseAnnouncementEmails
} = require('../controllers/courseAnnouncements.controller');
const { authenticateToken, verifyRole } = require('../middlewares/auth');

const admin = [authenticateToken, verifyRole('admin', 'board')];

// Preview recipient count (admin/board)
router.get('/recipients-preview', ...admin, getCourseRecipientsPreview);
router.post('/recipients-preview', ...admin, getCourseRecipientsPreview);

// Send direct message/email to a specific course member (admin/board)
router.post('/message-member', ...admin, sendDirectCourseMemberMessage);

// Get all announcements for a course (public sees active, admin sees all)
router.get('/', getCourseAnnouncements);

// Get specific course announcement (public)
router.get('/:announcementId', getCourseAnnouncementById);

// Create announcement and optionally broadcast emails (admin/board)
router.post('/', ...admin, createCourseAnnouncement);

// Update announcement (admin/board)
router.put('/:announcementId', ...admin, updateCourseAnnouncement);

// Delete announcement (admin/board)
router.delete('/:announcementId', ...admin, deleteCourseAnnouncement);

// Resend announcement emails to targeted course members (admin/board)
router.post('/:announcementId/resend-emails', ...admin, resendCourseAnnouncementEmails);

module.exports = router;
