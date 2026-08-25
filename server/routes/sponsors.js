const express = require('express');
const router = express.Router();
const {
  getAllSponsors,
  createSponsor,
  updateSponsor,
  deleteSponsor
} = require('../controllers/sponsor');
const { authenticateToken, verifyRole } = require('../middlewares/auth');

router.get('/', getAllSponsors);
router.post('/', authenticateToken, verifyRole('admin', 'board'), createSponsor);
router.put('/:id', authenticateToken, verifyRole('admin', 'board'), updateSponsor);
router.delete('/:id', authenticateToken, verifyRole('admin', 'board'), deleteSponsor);

module.exports = router;
