const express = require('express');
const router = express.Router();
const {
  getAllSiteContent,
  getSiteContentByKey,
  updateSiteContent,
  resetSiteContent
} = require('../controllers/siteContent');
const { authenticateToken, verifyRole } = require('../middlewares/auth');

router.get('/', getAllSiteContent);
router.get('/:key', getSiteContentByKey);
router.put('/:key', authenticateToken, verifyRole('admin', 'board'), updateSiteContent);
router.post('/:key/reset', authenticateToken, verifyRole('admin', 'board'), resetSiteContent);

module.exports = router;
