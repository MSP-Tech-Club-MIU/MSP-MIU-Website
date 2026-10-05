const express = require('express');
const { createFeedback, getFeedbackSummary } = require('../controllers/feedback');
const { optionalAuth } = require('../middlewares/auth');

const router = express.Router();

// Public creation — guests and authenticated users can submit; optionalAuth captures user if logged in
router.post('/', optionalAuth, createFeedback);

// Public summary / ratings breakdown
router.get('/summary', getFeedbackSummary);

module.exports = router;
