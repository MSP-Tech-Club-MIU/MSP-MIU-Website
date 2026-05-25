const express = require('express');
const router = express.Router();
const { addEvent, getAllEvents, getEventById, updateEvent, downloadContent, deleteEvent, addFeedback, getEventFeedback, deleteFeedback } = require('../controllers/events');
const { authenticateToken, verifyRole } = require('../middlewares/auth');

// Get all events (public or authenticated based on your requirements)
router.get('/', getAllEvents);

// Get event by ID (public or authenticated based on your requirements)
router.get('/:id', getEventById);

// Create event (admin and board only)
router.post('/', authenticateToken, verifyRole('admin', 'board'),addEvent);

// Update event (admin and board only)
router.put('/:id', authenticateToken, verifyRole('admin', 'board'), updateEvent);

// Download content
router.get("/:id/download", downloadContent);

// Delete event (admin and board only)
router.delete('/:id', authenticateToken, verifyRole('admin', 'board'), deleteEvent);

// Feedback routes
// Get all feedback for an event (public)
router.get('/:id/feedback', getEventFeedback);

// Add feedback to an event (guests can submit)
router.post('/:id/feedback', addFeedback);

// Delete feedback (admin/board only)
router.delete('/:eventId/feedback/:feedbackId', authenticateToken, verifyRole('admin', 'board'), deleteFeedback);

module.exports = router;