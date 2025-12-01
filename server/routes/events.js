const express = require('express');
const router = express.Router();
const { addEvent, getAllEvents, getEventById, updateEvent, downloadContent, deleteEvent } = require('../controllers/events');
const { authenticateToken, verifyRole } = require('../middlewares/auth');
const upload = require('../middlewares/uploads');

// Middleware wrapper to conditionally apply multer only for multipart/form-data requests
const optionalMulterFields = (fields) => {
    return (req, res, next) => {
        const contentType = req.get('content-type') || '';
        // Only use multer for multipart/form-data requests
        if (contentType.includes('multipart/form-data')) {
            return upload.fields(fields)(req, res, next);
        }
        // For JSON requests, skip multer and continue
        next();
    };
};

// Get all events (public or authenticated based on your requirements)
router.get('/', getAllEvents);

// Get event by ID (public or authenticated based on your requirements)
router.get('/:id', getEventById);

// Create event (admin and board only)
router.post('/', authenticateToken, verifyRole('admin', 'board'), optionalMulterFields([
        { name: "main_image"},
        { name: "file" }
    ]),  addEvent);

// Update event (admin and board only)
router.put('/:id', authenticateToken, verifyRole('admin', 'board'), optionalMulterFields([
        { name: "file"},
        { name: "main_image" }
    ]), updateEvent);

// Download content
router.get("/:id/download", downloadContent);

// Delete event (admin and board only)
router.delete('/:id', authenticateToken, verifyRole('admin', 'board'), deleteEvent);

module.exports = router;