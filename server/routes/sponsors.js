const express = require('express');
const router = express.Router();
const { getAllSponsors } = require('../controllers/sponsor');

router.get('/', getAllSponsors);

module.exports = router;
