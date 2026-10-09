const path = require('path');
const { Op } = require('sequelize');
const {
  r2,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command
} = require('../config/cloud');
const { Board, User } = require('../models');
const logger = require('../utils/logger');

/**
 * Extract R2 object key from a full URL, absolute path, relative key, or filename.
 * @param {string} urlOrKey - Full URL, path, or key
 * @param {string[]} expectedPrefixes - Optional list of required prefixes (e.g. ['Board_Photos/'])
 * @returns {string|null} - Sanitized R2 key or null if not applicable
 */
function r2KeyFromUrlOrKey(urlOrKey, expectedPrefixes = []) {
  if (!urlOrKey || typeof urlOrKey !== 'string') return null;
  let trimmed = urlOrKey.trim();
  if (!trimmed) return null;

  // Strip query params and hash fragments (e.g. ?t=123456#top)
  trimmed = trimmed.split('?')[0].split('#')[0].trim();
  if (!trimmed) return null;

  let key = null;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      let pathname = decodeURIComponent(parsed.pathname || '').replace(/^\/+/, '');
      if (!pathname) return null;

      const publicDomain = process.env.R2_PUBLIC_DOMAIN;
      let isOurDomain = false;
      if (publicDomain) {
        try {
          const pubUrl = new URL(publicDomain);
          if (parsed.host.toLowerCase() === pubUrl.host.toLowerCase()) {
            isOurDomain = true;
          }
        } catch (_) {
          // Ignore URL parse error on invalid env variable
        }
      }

      const matchesPrefix = expectedPrefixes.length === 0 || expectedPrefixes.some((p) => pathname.startsWith(p));

      // Accept if it matches our configured public domain or matches known storage prefixes
      if (isOurDomain || matchesPrefix) {
        key = pathname;
      } else {
        return null;
      }
    } catch (_) {
      return null;
    }
  } else {
    try {
      key = decodeURIComponent(trimmed).replace(/\\/g, '/').replace(/^\/+/, '');
    } catch (_) {
      key = trimmed.replace(/\\/g, '/').replace(/^\/+/, '');
    }
  }

  if (!key) return null;

  // Clean path traversal sequences
  key = key.replace(/\.\./g, '').replace(/\/+/g, '/').replace(/^\/+/, '');
  if (!key) return null;

  // If prefixes are expected, check match or handle single filename
  if (expectedPrefixes && expectedPrefixes.length > 0) {
    const matches = expectedPrefixes.some((p) => key.startsWith(p));
    if (!matches) {
      // If it's a bare filename without directories and Profile_Pictures/ is expected
      if (!key.includes('/') && expectedPrefixes.includes('Profile_Pictures/')) {
        key = `Profile_Pictures/${key}`;
      } else {
        return null;
      }
    }
  }

  return key;
}

/**
 * Delete a single object from Cloudflare R2.
 * @param {string} key - R2 object key
 * @returns {Promise<boolean>}
 */
async function deleteObjectFromR2(key) {
  const bucket = process.env.R2_BUCKET;
  if (!bucket || !key) return false;

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    });
    await r2.send(command);
    logger.info('Deleted cloud storage object', { key });
    return true;
  } catch (error) {
    logger.warn('Failed to delete cloud storage object', { key, error: error.message });
    return false;
  }
}

/**
 * Delete multiple objects from Cloudflare R2 in batches.
 * @param {string[]} keys - Array of object keys to delete
 * @returns {Promise<string[]>} - Array of deleted keys
 */
async function deleteObjectsFromR2(keys) {
  const bucket = process.env.R2_BUCKET;
  if (!bucket || !Array.isArray(keys) || keys.length === 0) return [];

  const uniqueKeys = [...new Set(keys.filter(Boolean))];
  const deleted = [];
  const BATCH_SIZE = 500;

  for (let i = 0; i < uniqueKeys.length; i += BATCH_SIZE) {
    const batch = uniqueKeys.slice(i, i + BATCH_SIZE);
    try {
      const command = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: batch.map((k) => ({ Key: k })),
          Quiet: true
        }
      });
      await r2.send(command);
      deleted.push(...batch);
      logger.info('Batch deleted cloud storage objects', { count: batch.length });
    } catch (err) {
      logger.warn('Batch delete failed, falling back to sequential delete', { error: err.message });
      for (const singleKey of batch) {
        const ok = await deleteObjectFromR2(singleKey);
        if (ok) deleted.push(singleKey);
      }
    }
  }

  return deleted;
}

/**
 * Delete an old Meet the Board photo if it is no longer referenced by any Board member.
 * @param {string} photoUrlOrKey - The old photo url or key to delete
 * @param {object} options
 * @param {number} [options.excludeBoardId] - Board ID to exclude from reference check
 * @returns {Promise<{ deleted: boolean, key: string|null, reason?: string }>}
 */
async function deleteUnusedBoardPhoto(photoUrlOrKey, { excludeBoardId = null } = {}) {
  const key = r2KeyFromUrlOrKey(photoUrlOrKey, ['Board_Photos/', 'Images/']);
  if (!key) {
    return { deleted: false, key: null, reason: 'not_r2_photo' };
  }

  try {
    const publicDomain = (process.env.R2_PUBLIC_DOMAIN || '').replace(/\/+$/, '');
    const fullUrl = publicDomain ? `${publicDomain}/${key}` : null;

    const whereConditions = [
      { photo_url: photoUrlOrKey },
      { photo_url: key },
      { photo_url: { [Op.like]: `%/${key}` } }
    ];
    if (fullUrl) {
      whereConditions.push({ photo_url: fullUrl });
    }

    const where = {
      [Op.or]: whereConditions
    };
    if (excludeBoardId != null) {
      where.board_id = { [Op.ne]: Number(excludeBoardId) };
    }

    const inUseCount = await Board.count({ where });
    if (inUseCount > 0) {
      logger.info('Board photo is still referenced by another board record; keeping in storage', {
        key,
        inUseCount
      });
      return { deleted: false, key, reason: 'still_in_use' };
    }

    const success = await deleteObjectFromR2(key);
    return { deleted: success, key };
  } catch (error) {
    logger.warn('Error while checking/deleting unused board photo', {
      key,
      error: error.message
    });
    return { deleted: false, key, reason: error.message };
  }
}

/**
 * Delete an old user profile picture if it is no longer referenced by any user account.
 * @param {string} profilePicOrKey - The old profile picture url, key, or filename to delete
 * @param {object} options
 * @param {number} [options.excludeUserId] - User ID to exclude from reference check
 * @returns {Promise<{ deleted: boolean, key: string|null, reason?: string }>}
 */
async function deleteUnusedProfilePicture(profilePicOrKey, { excludeUserId = null } = {}) {
  const key = r2KeyFromUrlOrKey(profilePicOrKey, ['Profile_Pictures/']);
  if (!key) {
    return { deleted: false, key: null, reason: 'not_r2_photo' };
  }

  try {
    const filename = path.basename(key);
    const publicDomain = (process.env.R2_PUBLIC_DOMAIN || '').replace(/\/+$/, '');
    const fullUrl = publicDomain ? `${publicDomain}/${key}` : null;

    const whereConditions = [
      { profile_picture: profilePicOrKey },
      { profile_picture: key },
      { profile_picture: filename },
      { profile_picture: { [Op.like]: `%/${key}` } },
      { profile_picture: { [Op.like]: `%/${filename}` } }
    ];
    if (fullUrl) {
      whereConditions.push({ profile_picture: fullUrl });
    }

    const where = {
      [Op.or]: whereConditions
    };
    if (excludeUserId != null) {
      where.user_id = { [Op.ne]: Number(excludeUserId) };
    }

    const inUseCount = await User.count({ where });
    if (inUseCount > 0) {
      logger.info('Profile picture is still referenced by another user; keeping in storage', {
        key,
        inUseCount
      });
      return { deleted: false, key, reason: 'still_in_use' };
    }

    const success = await deleteObjectFromR2(key);
    return { deleted: success, key };
  } catch (error) {
    logger.warn('Error while checking/deleting unused profile picture', {
      key,
      error: error.message
    });
    return { deleted: false, key, reason: error.message };
  }
}

/**
 * Fetch all objects in R2 matching a prefix, traversing through pagination.
 * @param {string} prefix - The bucket key prefix
 * @returns {Promise<Array<{ key: string, size: number, lastModified: Date }>>}
 */
async function listAllObjectsByPrefix(prefix) {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) return [];

  const items = [];
  let continuationToken = undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken
    });

    const res = await r2.send(command);
    if (Array.isArray(res.Contents)) {
      for (const obj of res.Contents) {
        if (!obj.Key || obj.Key.endsWith('/')) continue;
        items.push({
          key: obj.Key,
          size: obj.Size || 0,
          lastModified: obj.LastModified ? new Date(obj.LastModified) : null
        });
      }
    }

    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return items;
}

/**
 * Sweep cloud storage and delete all unused Meet the Board photos and user profile pictures.
 * Compares objects in storage against active records in the database.
 *
 * @param {object} options
 * @param {boolean} [options.dryRun=false] - If true, only reports what would be deleted without deleting
 * @param {number} [options.minAgeMinutes=5] - Skip objects uploaded within this many minutes to avoid racing in-flight uploads
 * @param {boolean} [options.force=false] - Ignore minAgeMinutes check
 * @returns {Promise<object>}
 */
async function cleanupAllUnusedImages({ dryRun = false, minAgeMinutes = 5, force = false } = {}) {
  const cutoffTime = force ? null : new Date(Date.now() - (minAgeMinutes * 60 * 1000));

  // 1. Gather all active Board photo keys from DB
  const boardRows = await Board.findAll({
    attributes: ['board_id', 'photo_url'],
    where: { photo_url: { [Op.ne]: null } },
    raw: true
  });

  const activeBoardKeys = new Set();
  for (const row of boardRows) {
    const key = r2KeyFromUrlOrKey(row.photo_url, ['Board_Photos/', 'Images/']);
    if (key) activeBoardKeys.add(key);
  }

  // 2. Gather all active User profile picture keys from DB
  const userRows = await User.findAll({
    attributes: ['user_id', 'profile_picture'],
    where: { profile_picture: { [Op.ne]: null } },
    raw: true
  });

  const activeProfileKeys = new Set();
  for (const row of userRows) {
    const key = r2KeyFromUrlOrKey(row.profile_picture, ['Profile_Pictures/']);
    if (key) activeProfileKeys.add(key);
  }

  // 3. Scan Board_Photos/ in R2
  const boardStorageObjects = await listAllObjectsByPrefix('Board_Photos/');
  const unusedBoardKeys = [];
  for (const obj of boardStorageObjects) {
    if (cutoffTime && obj.lastModified && obj.lastModified > cutoffTime) {
      continue; // Skip very recent uploads to avoid race conditions
    }
    if (!activeBoardKeys.has(obj.key)) {
      unusedBoardKeys.push(obj.key);
    }
  }

  // 4. Scan Profile_Pictures/ in R2
  const profileStorageObjects = await listAllObjectsByPrefix('Profile_Pictures/');
  const unusedProfileKeys = [];
  for (const obj of profileStorageObjects) {
    if (cutoffTime && obj.lastModified && obj.lastModified > cutoffTime) {
      continue;
    }
    if (!activeProfileKeys.has(obj.key)) {
      unusedProfileKeys.push(obj.key);
    }
  }

  // 5. Scan legacy Images/board_* in R2
  const imagesStorageObjects = await listAllObjectsByPrefix('Images/board_');
  const unusedLegacyBoardKeys = [];
  for (const obj of imagesStorageObjects) {
    if (cutoffTime && obj.lastModified && obj.lastModified > cutoffTime) {
      continue;
    }
    if (!activeBoardKeys.has(obj.key)) {
      unusedLegacyBoardKeys.push(obj.key);
    }
  }

  // 6. Delete unused keys if not dry-run
  const deletedBoardPhotos = dryRun ? [] : await deleteObjectsFromR2(unusedBoardKeys);
  const deletedProfilePictures = dryRun ? [] : await deleteObjectsFromR2(unusedProfileKeys);
  const deletedLegacyBoard = dryRun ? [] : await deleteObjectsFromR2(unusedLegacyBoardKeys);

  const totalUnused = unusedBoardKeys.length + unusedProfileKeys.length + unusedLegacyBoardKeys.length;
  const totalDeleted = dryRun
    ? 0
    : deletedBoardPhotos.length + deletedProfilePictures.length + deletedLegacyBoard.length;

  return {
    success: true,
    dryRun: Boolean(dryRun),
    summary: {
      boardPhotosScanned: boardStorageObjects.length,
      boardPhotosActive: activeBoardKeys.size,
      boardPhotosUnused: unusedBoardKeys.length,
      boardPhotosDeleted: dryRun ? 0 : deletedBoardPhotos.length,
      profilePicturesScanned: profileStorageObjects.length,
      profilePicturesActive: activeProfileKeys.size,
      profilePicturesUnused: unusedProfileKeys.length,
      profilePicturesDeleted: dryRun ? 0 : deletedProfilePictures.length,
      legacyBoardScanned: imagesStorageObjects.length,
      legacyBoardUnused: unusedLegacyBoardKeys.length,
      legacyBoardDeleted: dryRun ? 0 : deletedLegacyBoard.length,
      totalUnused,
      totalDeleted
    },
    deleted: {
      boardPhotos: dryRun ? unusedBoardKeys : deletedBoardPhotos,
      profilePictures: dryRun ? unusedProfileKeys : deletedProfilePictures,
      legacyBoardPhotos: dryRun ? unusedLegacyBoardKeys : deletedLegacyBoard
    }
  };
}

module.exports = {
  r2KeyFromUrlOrKey,
  deleteObjectFromR2,
  deleteObjectsFromR2,
  deleteUnusedBoardPhoto,
  deleteUnusedProfilePicture,
  listAllObjectsByPrefix,
  cleanupAllUnusedImages
};
