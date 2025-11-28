const express = require('express');
const router = express.Router();
const { getImages,getSlides,getVideos,getCodes,getAssets,getEventThumbnails,getDocuments } = require('../controllers/cloud');

// Get all images from cloud storage (public endpoint)
router.get('/images', getImages);
router.get('/slides', getSlides);
router.get('/videos', getVideos);
router.get('/codes', getCodes);
router.get('/assets', getAssets);
router.get('/event-thumbnails', getEventThumbnails);
router.get('/documents', getDocuments);

module.exports = router;

