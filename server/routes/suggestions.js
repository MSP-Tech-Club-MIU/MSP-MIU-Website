const express = require('express');
const { createSuggestion } = require('../controllers/suggestions');
const { optionalAuth } = require('../middlewares/auth');

const router = express.Router();

// Public — anyone can submit; auth is optional to link a member when logged in
router.post('/', optionalAuth, createSuggestion);

module.exports = router;
