const express = require('express');
const router = express.Router();
const {
  getImages,
  getAssetsByType,
  getSlides,
  getVideos,
  getCodes,
  getAssets,
  getEventThumbnails,
  getDocuments,
  deleteCloudObject,
  replaceCloudObject
} = require('../controllers/cloud');
const { authenticateToken, verifyRole } = require('../middlewares/auth');
const { upload } = require('../middlewares/multer');

// Images endpoint (kept separate due to special handling)
router.get('/images', getImages);

// Delete a stored object (admin/board)
router.delete('/object', authenticateToken, verifyRole('admin', 'board'), deleteCloudObject);

// Replace a stored object in-place (same key) — admin/board
router.put(
  '/object',
  authenticateToken,
  verifyRole('admin', 'board'),
  upload.single('file'),
  replaceCloudObject
);

// Legacy individual endpoints (for backward compatibility)
// These should come before the generic route to avoid conflicts
router.get('/slides', getSlides);
router.get('/videos', getVideos);
router.get('/codes', getCodes);
router.get('/assets', getAssets); // Specific route for /assets (must come before /assets/:type)
router.get('/event-thumbnails', getEventThumbnails);
router.get('/documents', getDocuments);

// Generic asset endpoint - handles slides, videos, codes, assets, event-thumbnails, documents
// Usage: /cloud/assets/slides, /cloud/assets/videos, /cloud/assets/assets, etc.
// Note: This route must come after the specific /assets route to avoid conflicts
router.get('/assets/:type', getAssetsByType);

module.exports = router;

