const express = require('express');
const router = express.Router();
const { 
  getAllAnnouncements, 
  getAnnouncementById, 
  addAnnouncement, 
  updateAnnouncement, 
  deleteAnnouncement 
} = require('../controllers/announcements');
const { authenticateToken, verifyRole } = require('../middlewares/auth');

// Get all announcements (public - only active ones by default)
router.get('/', getAllAnnouncements);

// Get announcement by ID (public)
router.get('/:id', getAnnouncementById);

// Create announcement (admin/board only)
router.post('/', authenticateToken, verifyRole('admin', 'board'), addAnnouncement);

// Update announcement (admin/board only)
router.put('/:id', authenticateToken, verifyRole('admin', 'board'), updateAnnouncement);

// Delete announcement (admin/board only)
router.delete('/:id', authenticateToken, verifyRole('admin', 'board'), deleteAnnouncement);

module.exports = router;

