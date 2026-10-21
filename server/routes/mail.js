const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticateToken, verifyRole } = require('../middlewares/auth');
const {
  sendDirectEmail,
  listEmails,
  getEmailById,
  toggleStar,
  deleteEmail,
  restoreEmail,
  saveDraft,
  searchRecipients,
  getMailStatus
} = require('../controllers/webmail');

// Multer memory storage configured for email attachments (up to 10 files, 25MB each/total)
const mailUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 10
  }
});

// Require Admin or Board role
const adminBoard = [authenticateToken, verifyRole('admin', 'board')];

// Send direct email with attachments
router.post('/send', ...adminBoard, mailUpload.array('attachments', 10), sendDirectEmail);

// List emails (folders: sent, starred, drafts, trash; search; pagination)
router.get('/', ...adminBoard, listEmails);

// Recipient autocomplete suggestions
router.get('/recipients', ...adminBoard, searchRecipients);

// SMTP configuration & ready status
router.get('/status', ...adminBoard, getMailStatus);

// Save / update email draft
router.post('/draft', ...adminBoard, mailUpload.none(), saveDraft);

// Get single email details
router.get('/:id', ...adminBoard, getEmailById);

// Star / Unstar email
router.patch('/:id/star', ...adminBoard, toggleStar);

// Move to trash or permanently delete
router.delete('/:id', ...adminBoard, deleteEmail);

// Restore email from trash
router.post('/:id/restore', ...adminBoard, restoreEmail);

module.exports = router;
