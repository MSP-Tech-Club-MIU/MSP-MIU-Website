const express = require('express');
const router = express.Router();
const { addEvent, getAllEvents, getEventById, updateEvent, downloadContent, deleteEvent } = require('../controllers/events');
const { authenticateToken, verifyRole } = require('../middlewares/auth');
const upload = require('../middlewares/multer');

// Get all events (public or authenticated based on your requirements)
router.get('/', getAllEvents);

// Get event by ID (public or authenticated based on your requirements)
router.get('/:id', getEventById);

// Create event (admin and board only)
router.post('/', authenticateToken, verifyRole('admin', 'board'), optionalMulterFields([
        { name: "main_image"},
        { name: "upload_file" }
    ]),  addEvent);

// Update event (admin and board only)
router.put('/:id', authenticateToken, verifyRole('admin', 'board'), upload.fields([
        { name: "upload_file"},
        { name: "main_image" }
    ]), updateEvent);

// Download content
router.get("/:id/download", downloadContent);

// Delete event (admin and board only)
router.delete('/:id', authenticateToken, verifyRole('admin', 'board'), deleteEvent);

module.exports = router;