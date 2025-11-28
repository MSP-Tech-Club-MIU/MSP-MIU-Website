const { r2 } = require('../config/cloud');
const { ListObjectsV2Command } = require('@aws-sdk/client-s3');

/**
 * Validates and sanitizes the base URL from environment variable
 * @param {string} baseUrl - The base URL from environment variable
 * @returns {string|null} - Validated base URL or null if invalid
 */
function validateBaseUrl(baseUrl) {
  if (!baseUrl || typeof baseUrl !== 'string') {
    return null;
  }

  // Remove trailing slashes
  const cleaned = baseUrl.trim().replace(/\/+$/, '');
  
  // Validate URL format
  try {
    const url = new URL(cleaned);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      console.error('Invalid protocol in R2_PUBLIC_DOMAIN:', url.protocol);
      return null;
    }
    return cleaned;
  } catch (error) {
    console.error('Invalid URL format in R2_PUBLIC_DOMAIN:', error.message);
    return null;
  }
}

/**
 * Sanitizes object key to prevent path traversal and ensure safe URL construction
 * @param {string} key - The object key from R2
 * @returns {string} - Sanitized key
 */
function sanitizeObjectKey(key) {
  if (!key || typeof key !== 'string') {
    return '';
  }

  // Remove path traversal sequences
  let sanitized = key
    .replace(/\.\./g, '') // Remove .. sequences
    .replace(/^\/+/, '') // Remove leading slashes
    .replace(/\/+/g, '/'); // Normalize multiple slashes

  // Ensure key doesn't start with / to prevent issues
  if (sanitized.startsWith('/')) {
    sanitized = sanitized.substring(1);
  }

  return sanitized;
}

/**
 * Safely constructs a public URL for an object
 * @param {string} baseUrl - Validated base URL
 * @param {string} objectKey - Object key from R2
 * @returns {string} - Safe public URL
 */
function buildSafeUrl(baseUrl, objectKey) {
  const validatedBase = validateBaseUrl(baseUrl);
  if (!validatedBase) {
    // If base URL is invalid, return empty string or just the sanitized key
    return '';
  }

  const sanitizedKey = sanitizeObjectKey(objectKey);
  if (!sanitizedKey) {
    return '';
  }

  // Construct URL safely - ensure single slash between base and key
  return `${validatedBase}/${sanitizedKey}`;
}

// Get all images from cloud storage
const getImages = async (req, res) => {
  try {
    const bucket = process.env.R2_BUCKET;
    const prefix = 'Images/';
    
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix
    });

    const response = await r2.send(command);
    
    // Filter out directories (objects ending with /) and get only image files
    const imageFiles = (response.Contents || [])
      .filter(obj => {
        // Exclude directories and ensure it's an image file
        const key = obj.Key;
        const isDirectory = key.endsWith('/');
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(key);
        return !isDirectory && isImage;
      })
      .map(obj => {
        // Return the full URL to the image using secure URL construction
        const imageKey = obj.Key;
        const imageUrl = buildSafeUrl(process.env.R2_PUBLIC_DOMAIN, imageKey);
        
        return {
          key: imageKey,
          url: imageUrl || imageKey, // Fallback to key if URL construction fails
          name: imageKey.replace(prefix, ''),
          size: obj.Size,
          lastModified: obj.LastModified
        };
      });

    res.json({
      success: true,
      images: imageFiles,
      count: imageFiles.length
    });
  } catch (error) {
    console.error('Error fetching images from R2:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch images',
      message: error.message
    });
  }
};

// Get all slides from cloud storage
const getSlides = async (req, res) => {
  try {
    const bucket = process.env.R2_BUCKET;
    const prefix = 'Slides/';
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix
    });
    const response = await r2.send(command);
    const slides = response.Contents.map(obj => {
      const slideUrl = buildSafeUrl(process.env.R2_PUBLIC_DOMAIN, obj.Key);
      return {
        key: obj.Key,
        url: slideUrl || obj.Key,
        name: obj.Key.split('/').pop(),
        size: obj.Size,
        lastModified: obj.LastModified
      };
    });
    res.json({
      success: true,
      slides: slides,
      count: slides.length
    });
  } catch (error) {
    console.error('Error fetching slides from R2:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch slides',
      message: error.message
    });
  }
};

// Get all videos from cloud storage
const getVideos = async (req, res) => {
  try {
    const bucket = process.env.R2_BUCKET;
    const prefix = 'Videos/';
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix
    });
    const response = await r2.send(command);
    const videos = response.Contents.map(obj => {
      const videoUrl = buildSafeUrl(process.env.R2_PUBLIC_DOMAIN, obj.Key);
      return {
        key: obj.Key,
        url: videoUrl || obj.Key,
        name: obj.Key.split('/').pop(),
        size: obj.Size,
        lastModified: obj.LastModified
      };
    });
    res.json({
      success: true,
      videos: videos,
      count: videos.length
    });
  } catch (error) {
    console.error('Error fetching videos from R2:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch videos',
      message: error.message
    });
  }
};

// Get all codes from cloud storage
const getCodes = async (req, res) => {
  try {
    const bucket = process.env.R2_BUCKET;
    const prefix = 'Codes/';
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix
    });
    const response = await r2.send(command);
    const codes = response.Contents.map(obj => {
      const codeUrl = buildSafeUrl(process.env.R2_PUBLIC_DOMAIN, obj.Key);
      return {
        key: obj.Key,
        url: codeUrl || obj.Key,
        name: obj.Key.split('/').pop(),
        size: obj.Size,
        lastModified: obj.LastModified
      };
    });
    res.json({
      success: true,
      codes: codes,
      count: codes.length
    });
  } catch (error) {
    console.error('Error fetching codes from R2:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch codes',
      message: error.message
    });
  }
};

// Get all assets from cloud storage
const getAssets = async (req, res) => {
  try {
    const bucket = process.env.R2_BUCKET;
    const prefix = 'Assets/';
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix
    });
    const response = await r2.send(command);
    const assets = response.Contents.map(obj => {
      const assetUrl = buildSafeUrl(process.env.R2_PUBLIC_DOMAIN, obj.Key);
      return {
        key: obj.Key,
        url: assetUrl || obj.Key,
        name: obj.Key.split('/').pop(),
        size: obj.Size,
        lastModified: obj.LastModified
      };
    });
    res.json({
      success: true,
      assets: assets,
      count: assets.length
    });
  } catch (error) {
    console.error('Error fetching assets from R2:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assets',
      message: error.message
    });
  }
};

// Get all event thumbnails from cloud storage
const getEventThumbnails = async (req, res) => {
  try {
    const bucket = process.env.R2_BUCKET;
    const prefix = 'Events_Thumbnails/';
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix
    });
    const response = await r2.send(command);
    const eventThumbnails = response.Contents.map(obj => {
      const thumbnailUrl = buildSafeUrl(process.env.R2_PUBLIC_DOMAIN, obj.Key);
      return {
        key: obj.Key,
        url: thumbnailUrl || obj.Key,
        name: obj.Key.split('/').pop(),
        size: obj.Size,
        lastModified: obj.LastModified
      };
    });
    res.json({
      success: true,
      eventThumbnails: eventThumbnails,
      count: eventThumbnails.length
    });
  } catch (error) {
    console.error('Error fetching event thumbnails from R2:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event thumbnails',
      message: error.message
    });
  }
};

// Get all documents from cloud storage
const getDocuments = async (req, res) => {
  try {
    const bucket = process.env.R2_BUCKET;
    const prefix = 'Documents/';
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix
    });
    const response = await r2.send(command);
    const documents = response.Contents.map(obj => {
      const documentUrl = buildSafeUrl(process.env.R2_PUBLIC_DOMAIN, obj.Key);
      return {
        key: obj.Key,
        url: documentUrl || obj.Key,
        name: obj.Key.split('/').pop(),
        size: obj.Size,
        lastModified: obj.LastModified
      };
    });
    res.json({
      success: true,
      documents: documents,
      count: documents.length
    });
  } catch (error) {
    console.error('Error fetching documents from R2:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents',
      message: error.message
    });
  }
};

module.exports = {
  getImages,
  getSlides,
  getVideos,
  getCodes,
  getAssets,
  getEventThumbnails,
  getDocuments
};