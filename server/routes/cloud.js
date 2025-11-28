const express = require('express');
const router = express.Router();
const { getImages, getAssetsByType, getSlides, getVideos, getCodes, getAssets, getEventThumbnails, getDocuments } = require('../controllers/cloud');

// Images endpoint (kept separate due to special handling)
router.get('/images', getImages);

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

