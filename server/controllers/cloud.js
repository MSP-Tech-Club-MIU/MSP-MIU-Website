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

/**
 * Generic function to get assets by type from cloud storage
 * Handles: slides, videos, codes, assets, event-thumbnails, documents
 */
const getAssetsByType = async (req, res) => {
  try {
    const { type } = req.params;
    
    // Asset type configuration
    const assetConfig = {
      slides: {
        prefix: 'Slides/',
        fileFilter: (key) => /\.(ppt|pptx|pdf)$/i.test(key)
      },
      videos: {
        prefix: 'Videos/',
        fileFilter: (key) => /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i.test(key)
      },
      codes: {
        prefix: 'Codes/',
        fileFilter: null // No specific file type filter
      },
      assets: {
        prefix: 'Assets/',
        fileFilter: null // No specific file type filter
      },
      'event-thumbnails': {
        prefix: 'Events_Thumbnails/',
        fileFilter: (key) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(key)
      },
      documents: {
        prefix: 'Documents/',
        fileFilter: null // No specific file type filter
      }
    };

    // Validate asset type
    if (!assetConfig[type]) {
      return res.status(400).json({
        success: false,
        error: `Invalid asset type: ${type}. Supported types: ${Object.keys(assetConfig).join(', ')}`
      });
    }

    const config = assetConfig[type];
    const bucket = process.env.R2_BUCKET;
    
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: config.prefix
    });

    const response = await r2.send(command);
    
    // Validate response.Contents exists before mapping
    if (!response.Contents || !Array.isArray(response.Contents)) {
      return res.json({
        success: true,
        [type]: [],
        count: 0
      });
    }
    
    // Filter and map assets
    const assets = response.Contents
      .filter(obj => {
        const key = obj.Key;
        const isDirectory = key.endsWith('/');
        
        // Apply file type filter if configured
        if (config.fileFilter && !config.fileFilter(key)) {
          return false;
        }
        
        return !isDirectory;
      })
      .map(obj => {
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
      [type]: assets,
      count: assets.length
    });
  } catch (error) {
    console.error(`Error fetching ${req.params.type} from R2:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to fetch ${req.params.type}`,
      message: error.message
    });
  }
};

// Legacy individual functions for backward compatibility (delegate to generic function)
const getSlides = async (req, res) => {
  req.params.type = 'slides';
  return getAssetsByType(req, res);
};

const getVideos = async (req, res) => {
  req.params.type = 'videos';
  return getAssetsByType(req, res);
};

const getCodes = async (req, res) => {
  req.params.type = 'codes';
  return getAssetsByType(req, res);
};

const getAssets = async (req, res) => {
  req.params.type = 'assets';
  return getAssetsByType(req, res);
};

const getEventThumbnails = async (req, res) => {
  req.params.type = 'event-thumbnails';
  return getAssetsByType(req, res);
};

const getDocuments = async (req, res) => {
  req.params.type = 'documents';
  return getAssetsByType(req, res);
};

module.exports = {
  getImages,
  getAssetsByType,
  // Legacy functions for backward compatibility
  getSlides,
  getVideos,
  getCodes,
  getAssets,
  getEventThumbnails,
  getDocuments
};