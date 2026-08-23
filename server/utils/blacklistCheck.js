const { Blacklist, User, Member } = require('../models');
const logger = require('./logger');

/**
 * Normalize phone number by extracting only digits and matching local/international variations.
 */
function normalizePhoneDigits(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  // For Egyptian numbers: 01012345678, 201012345678, 00201012345678
  // Return last 10 digits for standard comparison
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Normalize student/university identifier (e.g. 2023/12345 vs 202312345).
 */
function normalizeId(idStr) {
  if (!idStr || typeof idStr !== 'string') return '';
  return idStr.trim().toLowerCase().replace(/[^a-z0-9]/gi, '');
}

/**
 * Normalize human name for comparison.
 */
function normalizeName(nameStr) {
  if (!nameStr || typeof nameStr !== 'string') return '';
  return nameStr.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Check whether a person or user is blacklisted from club activities.
 *
 * @param {Object} params
 * @param {string} [params.name]
 * @param {string} [params.full_name]
 * @param {string} [params.university_id]
 * @param {string} [params.identifier]
 * @param {string} [params.phone_number]
 * @param {number} [params.user_id]
 * @param {string} [params.email]
 * @returns {Promise<{ isBlacklisted: boolean, reason?: string, entry?: object }>}
 */
async function checkBlacklist(params = {}) {
  try {
    let {
      name,
      full_name,
      university_id,
      identifier,
      phone_number,
      user_id
    } = params;

    let candidateName = name || full_name || '';
    let candidateId = university_id || identifier || '';
    let candidatePhone = phone_number || '';

    // If user_id is provided, look up user details to supplement missing fields
    if (user_id) {
      try {
        const user = await User.findByPk(user_id, {
          attributes: ['user_id', 'full_name', 'university_id', 'email', 'phone_number']
        });
        if (user) {
          if (!candidateName && user.full_name) candidateName = user.full_name;
          if (!candidateId && user.university_id) candidateId = user.university_id;
          if (!candidatePhone && user.phone_number) candidatePhone = user.phone_number;
        }

        // Also check if member row has additional phone/name details
        if (!candidatePhone || !candidateName || !candidateId) {
          const member = await Member.findOne({
            where: { user_id },
            attributes: ['full_name', 'university_id', 'phone_number']
          });
          if (member) {
            if (!candidateName && member.full_name) candidateName = member.full_name;
            if (!candidateId && member.university_id) candidateId = member.university_id;
            if (!candidatePhone && member.phone_number) candidatePhone = member.phone_number;
          }
        }
      } catch (userLookupErr) {
        logger.warn('Blacklist check user lookup error:', userLookupErr.message);
      }
    }

    const normCandidateName = normalizeName(candidateName);
    const normCandidateId = normalizeId(candidateId);
    const normCandidatePhone = normalizePhoneDigits(candidatePhone);

    // If no candidate data is present to test against, return false
    if (!normCandidateName && !normCandidateId && !normCandidatePhone) {
      return { isBlacklisted: false };
    }

    const blacklistEntries = await Blacklist.findAll();
    if (!blacklistEntries || blacklistEntries.length === 0) {
      return { isBlacklisted: false };
    }

    for (const entry of blacklistEntries) {
      const entryName = normalizeName(entry.name);
      const entryId = normalizeId(entry.identifier);
      const entryPhone = normalizePhoneDigits(entry.phone_number);

      // Criteria match checks
      let matched = false;

      // 1. Identifier match
      if (entryId && normCandidateId && (entryId === normCandidateId)) {
        matched = true;
      }

      // 2. Phone match
      if (!matched && entryPhone && normCandidatePhone && (entryPhone === normCandidatePhone)) {
        matched = true;
      }

      // 3. Name match (exact trimmed lowercase or strong substring match)
      if (!matched && entryName && normCandidateName) {
        if (entryName === normCandidateName) {
          matched = true;
        } else if (entryName.length >= 5 && (normCandidateName.includes(entryName) || entryName.includes(normCandidateName))) {
          matched = true;
        }
      }

      if (matched) {
        return {
          isBlacklisted: true,
          reason: entry.reason || 'Restricted from participating in club activities',
          entry: {
            blacklist_id: entry.blacklist_id,
            name: entry.name,
            identifier: entry.identifier,
            phone_number: entry.phone_number,
            reason: entry.reason
          }
        };
      }
    }

    return { isBlacklisted: false };
  } catch (err) {
    logger.error('Error executing checkBlacklist:', err);
    // In case of error, fail safe (do not silently crash)
    return { isBlacklisted: false };
  }
}

module.exports = {
  checkBlacklist,
  normalizeName,
  normalizeId,
  normalizePhoneDigits
};
