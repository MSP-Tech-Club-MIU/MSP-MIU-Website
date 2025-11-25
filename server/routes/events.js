const express = require('express');
const router = express.Router();
const { addEvent } = require('../controllers/events');
const { verifyRole } = require('../middleware/auth');

router.post('/events', authenticateToken, verifyRole('admin'), addEvent);
router.get('/events', getAllEvents);