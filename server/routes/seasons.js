const express = require('express');
const router = express.Router();
const {
  listSeasons,
  getCurrentSeason,
  createSeason,
  updateSeason,
  setDefaultSeason
} = require('../controllers/seasons');
const { authenticateToken, optionalAuth } = require('../middlewares/auth');
const { adminAuth } = require('../middlewares/adminAuth');

router.get('/', optionalAuth, listSeasons);
router.get('/current', getCurrentSeason);

router.post('/', authenticateToken, adminAuth, createSeason);
router.put('/:id', authenticateToken, adminAuth, updateSeason);
router.post('/:id/set-default', authenticateToken, adminAuth, setDefaultSeason);

module.exports = router;
