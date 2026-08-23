const { r2, PutObjectCommand } = require('../config/cloud');
const { ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const { Op } = require('sequelize');
const Event = require('../models/Event');
const Board = require('../models/Board');
const { parsePagination, paginationMeta, paginateArray } = require('../utils/pagination');
const { logAdminAction } = require('../utils/adminNotification');
const logger = require('../utils/logger');

/** Extract R2 object key from a public URL (or return the path if already a key). */
function r2KeyFromPublicUrl(urlOrKey) {
  if (!urlOrKey || typeof urlOrKey !== 'string') return null;
  const trimmed = urlOrKey.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^\/+/, '');
  }
  try {
    const { pathname } = new URL(trimmed);
    return decodeURIComponent(pathname.replace(/^\/+/, ''));
  } catch {
    return null;
  }
}

const CLOUD_DIRECTORY_PREFIXES = [
  'Assets/',
  'Board_Photos/',
  'Codes/',
  'Courses/',
  'Events_Thumbnails/',
  'Images/',
  'Mobile Application/',
  'Slides/',
  'Profile_Pictures/',
  'Student_Schedules/',
  'Videos/',
  'Documents/'
];

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
      logger.error(`Invalid protocol in R2_PUBLIC_DOMAIN: ${url.protocol}`);
      return null;
    }
    return cleaned;
  } catch (error) {
    logger.error('Invalid URL format in R2_PUBLIC_DOMAIN:', error);
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

/**
 * Normalize a stored media URL/path for comparison against R2 keys.
 */
function normalizeMediaRef(value) {
  if (!value || typeof value !== 'string') return '';
  let cleaned = value.trim().split('?')[0].split('#')[0];
  try {
    cleaned = decodeURIComponent(cleaned);
  } catch {
    // keep original if malformed encoding
  }
  return cleaned.replace(/\\/g, '/');
}

/**
 * Whether a stored event media field references this cloud object.
 */
function mediaRefMatchesAsset(stored, asset) {
  const ref = normalizeMediaRef(stored);
  if (!ref || !asset?.key) return false;
  if (asset.url && (ref === normalizeMediaRef(asset.url) || ref.endsWith(`/${asset.key}`))) {
    return true;
  }
  return ref === asset.key || ref.endsWith(`/${asset.key}`) || ref.includes(asset.key);
}

/**
 * Attach linked event(s) for slides (upload_file) / thumbnails (main_image).
 */
async function attachEventLinks(assets, type) {
  if (!Array.isArray(assets) || assets.length === 0) return assets;
  if (type !== 'slides' && type !== 'event-thumbnails') return assets;

  const field = type === 'event-thumbnails' ? 'main_image' : 'upload_file';
  const events = await Event.findAll({
    attributes: ['event_id', 'name', 'event_date', field],
    where: {
      [field]: {
        [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }]
      }
    },
    order: [['event_date', 'DESC'], ['event_id', 'DESC']]
  });

  return assets.map((asset) => {
    const linked = events
      .filter((ev) => mediaRefMatchesAsset(ev[field], asset))
      .map((ev) => ({
        event_id: ev.event_id,
        name: ev.name,
        event_date: ev.event_date
      }));

    return {
      ...asset,
      events: linked,
      event: linked[0] || null
    };
  });
}

// Get gallery dome images only (excludes Meet the Board portraits)
const getImages = async (req, res) => {
  try {
    const bucket = process.env.R2_BUCKET;
    const prefix = 'Images/';
    
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix
    });

    const [response, boardRows] = await Promise.all([
      r2.send(command),
      Board.findAll({
        attributes: ['photo_url'],
        where: { photo_url: { [Op.ne]: null } },
        raw: true
      })
    ]);

    const boardPhotoKeys = new Set(
      boardRows
        .map((row) => r2KeyFromPublicUrl(row.photo_url))
        .filter((key) => key && key.startsWith(prefix))
    );
    
    // Filter out directories, non-images, and Meet the Board portraits
    const imageFiles = (response.Contents || [])
      .filter(obj => {
        const key = obj.Key;
        const isDirectory = key.endsWith('/');
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(key);
        const isLegacyBoardUpload = /^Images\/board_/i.test(key);
        const isLinkedBoardPhoto = boardPhotoKeys.has(key);
        return !isDirectory && isImage && !isLegacyBoardUpload && !isLinkedBoardPhoto;
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

    const { page, limit, offset } = parsePagination(req.query);
    const { rows, total } = paginateArray(imageFiles, { page, limit, offset });

    res.json({
      success: true,
      images: rows,
      data: rows,
      count: rows.length,
      pagination: paginationMeta({ page, limit, total })
    });
  } catch (error) {
    logger.error('Error fetching images from R2:', error);
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
      const { page, limit } = parsePagination(req.query);
      return res.json({
        success: true,
        [type]: [],
        data: [],
        count: 0,
        pagination: paginationMeta({ page, limit, total: 0 })
      });
    }
    
    // Filter and map assets
    let assets = response.Contents
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

    // Link slides / event thumbnails to the events that use them
    assets = await attachEventLinks(assets, type);

    const { page, limit, offset } = parsePagination(req.query);
    const { rows, total } = paginateArray(assets, { page, limit, offset });

    res.json({
      success: true,
      [type]: rows,
      data: rows,
      count: rows.length,
      pagination: paginationMeta({ page, limit, total })
    });
  } catch (error) {
    logger.error(`Error fetching ${req.params.type} from R2:`, error);
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

/**
 * DELETE cloud object by key (admin/board).
 * Body or query: { key: "Images/foo.jpg" }
 */
const deleteCloudObject = async (req, res) => {
  try {
    const rawKey = req.body?.key || req.query?.key;
    const key = sanitizeObjectKey(rawKey);
    if (!key) {
      return res.status(400).json({ success: false, error: 'key is required' });
    }

    const allowed = CLOUD_DIRECTORY_PREFIXES.some((prefix) => key.startsWith(prefix));
    if (!allowed) {
      return res.status(400).json({
        success: false,
        error: 'Key is not in an allowed media directory'
      });
    }

    await r2.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key
      })
    );

    await logAdminAction(
      'cloud_object_deleted',
      `Deleted cloud asset "${key}"`,
      req,
      'cloud',
      key
    );

    return res.json({ success: true, message: 'Object deleted', key });
  } catch (error) {
    logger.error('Error deleting cloud object:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete object'
    });
  }
};

/**
 * REPLACE cloud object at an existing key (admin/board).
 * Multipart: file + key (or query key). Overwrites the same R2 key so URLs stay stable.
 */
const replaceCloudObject = async (req, res) => {
  try {
    const rawKey = req.body?.key || req.query?.key;
    const key = sanitizeObjectKey(rawKey);
    const file = req.file;

    if (!key) {
      return res.status(400).json({ success: false, error: 'key is required' });
    }
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const allowed = CLOUD_DIRECTORY_PREFIXES.some((prefix) => key.startsWith(prefix));
    if (!allowed) {
      return res.status(400).json({
        success: false,
        error: 'Key is not in an allowed media directory'
      });
    }

    const existingExt = path.extname(key).toLowerCase();
    const uploadExt = path.extname(file.originalname).toLowerCase();
    if (existingExt && uploadExt && existingExt !== uploadExt) {
      return res.status(400).json({
        success: false,
        error: `Replacement must use the same file extension (${existingExt})`
      });
    }

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
      })
    );

    const url = buildSafeUrl(process.env.R2_PUBLIC_DOMAIN, key);

    await logAdminAction(
      'cloud_object_replaced',
      `Replaced cloud asset "${key}"`,
      req,
      'cloud',
      key
    );

    return res.json({
      success: true,
      message: 'Object replaced',
      key,
      url: url || key
    });
  } catch (error) {
    logger.error('Error replacing cloud object:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to replace object'
    });
  }
};

module.exports = {
  getImages,
  getAssetsByType,
  deleteCloudObject,
  replaceCloudObject,
  // Legacy functions for backward compatibility
  getSlides,
  getVideos,
  getCodes,
  getAssets,
  getEventThumbnails,
  getDocuments
};
