const express = require('express');
const router = express.Router();
const { addEvent, getAllEvents, getEventById, updateEvent, deleteEvent } = require('../controllers/events');
const { authenticateToken, verifyRole } = require('../middlewares/auth');

// Get all events (public or authenticated based on your requirements)
router.get('/', getAllEvents);

// Get event by ID (public or authenticated based on your requirements)
router.get('/:id', getEventById);

// Create event (admin only)
router.post('/', authenticateToken, verifyRole('admin'), addEvent);

// Update event (admin only)
router.put('/:id', authenticateToken, verifyRole('admin'), updateEvent);

// Delete event (admin only)
router.delete('/:id', authenticateToken, verifyRole('admin'), deleteEvent);

module.exports = router;