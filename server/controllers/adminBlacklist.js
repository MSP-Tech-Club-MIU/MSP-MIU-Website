const { Blacklist, User, AdminNotification } = require('../models');
const { Op } = require('sequelize');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const logger = require('../utils/logger');
const { logAuditEvent } = logger;

/**
 * Helper to log admin notifications for blacklist changes
 */
const logBlacklistNotification = async (req, actionType, message, entityId) => {
  try {
    const boardMember = req.boardMember;
    await AdminNotification.create({
      action_type: actionType,
      message,
      performed_by: req.user.user_id,
      performer_name: boardMember?.full_name || req.user?.full_name || 'Admin',
      performer_position: boardMember?.position || 'Admin',
      entity_type: 'blacklist',
      entity_id: entityId,
      season_id: null
    });
  } catch (err) {
    logger.error('Failed to log admin notification for blacklist:', err);
  }
};

/**
 * GET /api/admin/blacklist
 * List blacklisted individuals with pagination and search
 */
const getBlacklistEntries = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 20 });
    const { search } = req.query;

    const where = {};
    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim();
      where[Op.or] = [
        { name: { [Op.like]: `%${term}%` } },
        { identifier: { [Op.like]: `%${term}%` } },
        { phone_number: { [Op.like]: `%${term}%` } },
        { reason: { [Op.like]: `%${term}%` } }
      ];
    }

    const { rows: entries, count: total } = await Blacklist.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'email']
        }
      ]
    });

    res.json({
      success: true,
      data: entries,
      pagination: paginationMeta(total, page, limit)
    });
  } catch (err) {
    logger.error('Error fetching blacklist entries:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blacklist entries'
    });
  }
};

/**
 * GET /api/admin/blacklist/:id
 */
const getBlacklistEntryById = async (req, res) => {
  try {
    const entry = await Blacklist.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'email']
        }
      ]
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Blacklist entry not found'
      });
    }

    res.json({
      success: true,
      data: entry
    });
  } catch (err) {
    logger.error('Error fetching blacklist entry:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blacklist entry'
    });
  }
};

/**
 * POST /api/admin/blacklist
 * Add a person to the blacklist
 */
const createBlacklistEntry = async (req, res) => {
  try {
    const { name, identifier, phone_number, reason } = req.body || {};

    const trimmedName = typeof name === 'string' ? name.trim() : null;
    const trimmedId = typeof identifier === 'string' ? identifier.trim() : null;
    const trimmedPhone = typeof phone_number === 'string' ? phone_number.trim() : null;
    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';

    if (!trimmedReason) {
      return res.status(400).json({
        success: false,
        error: 'A reason must be provided for blacklisting'
      });
    }

    if (!trimmedName && !trimmedId && !trimmedPhone) {
      return res.status(400).json({
        success: false,
        error: 'At least one of Name, ID / University ID, or Phone Number must be provided'
      });
    }

    const newEntry = await Blacklist.create({
      name: trimmedName || null,
      identifier: trimmedId || null,
      phone_number: trimmedPhone || null,
      reason: trimmedReason,
      created_by_user_id: req.user.user_id
    });

    const displayTarget = trimmedName || trimmedId || trimmedPhone;
    await logBlacklistNotification(
      req,
      'blacklist_created',
      `Blacklisted "${displayTarget}": ${trimmedReason}`,
      newEntry.blacklist_id
    );

    logAuditEvent('BLACKLIST_CREATED', {
      blacklist_id: newEntry.blacklist_id,
      name: trimmedName,
      identifier: trimmedId,
      phone_number: trimmedPhone,
      reason: trimmedReason,
      admin_id: req.user.user_id
    }, req);

    res.status(201).json({
      success: true,
      message: 'Person successfully added to blacklist',
      data: newEntry
    });
  } catch (err) {
    logger.error('Error creating blacklist entry:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to create blacklist entry'
    });
  }
};

/**
 * PUT /api/admin/blacklist/:id
 * Update a blacklist entry
 */
const updateBlacklistEntry = async (req, res) => {
  try {
    const entry = await Blacklist.findByPk(req.params.id);
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Blacklist entry not found'
      });
    }

    const { name, identifier, phone_number, reason } = req.body || {};

    const trimmedName = typeof name === 'string' ? name.trim() : entry.name;
    const trimmedId = typeof identifier === 'string' ? identifier.trim() : entry.identifier;
    const trimmedPhone = typeof phone_number === 'string' ? phone_number.trim() : entry.phone_number;
    const trimmedReason = typeof reason === 'string' ? reason.trim() : entry.reason;

    if (!trimmedReason) {
      return res.status(400).json({
        success: false,
        error: 'A reason must be provided for blacklisting'
      });
    }

    if (!trimmedName && !trimmedId && !trimmedPhone) {
      return res.status(400).json({
        success: false,
        error: 'At least one of Name, ID / University ID, or Phone Number must be provided'
      });
    }

    await entry.update({
      name: trimmedName || null,
      identifier: trimmedId || null,
      phone_number: trimmedPhone || null,
      reason: trimmedReason
    });

    const displayTarget = trimmedName || trimmedId || trimmedPhone;
    await logBlacklistNotification(
      req,
      'blacklist_updated',
      `Updated blacklist for "${displayTarget}"`,
      entry.blacklist_id
    );

    logAuditEvent('BLACKLIST_UPDATED', {
      blacklist_id: entry.blacklist_id,
      name: trimmedName,
      identifier: trimmedId,
      phone_number: trimmedPhone,
      reason: trimmedReason,
      admin_id: req.user.user_id
    }, req);

    res.json({
      success: true,
      message: 'Blacklist entry updated successfully',
      data: entry
    });
  } catch (err) {
    logger.error('Error updating blacklist entry:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to update blacklist entry'
    });
  }
};

/**
 * DELETE /api/admin/blacklist/:id
 * Remove a person from the blacklist
 */
const deleteBlacklistEntry = async (req, res) => {
  try {
    const entry = await Blacklist.findByPk(req.params.id);
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Blacklist entry not found'
      });
    }

    const displayTarget = entry.name || entry.identifier || entry.phone_number || `#${entry.blacklist_id}`;
    await entry.destroy();

    await logBlacklistNotification(
      req,
      'blacklist_deleted',
      `Removed "${displayTarget}" from blacklist`,
      entry.blacklist_id
    );

    logAuditEvent('BLACKLIST_DELETED', {
      blacklist_id: entry.blacklist_id,
      target: displayTarget,
      admin_id: req.user.user_id
    }, req);

    res.json({
      success: true,
      message: 'Blacklist entry removed successfully'
    });
  } catch (err) {
    logger.error('Error deleting blacklist entry:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to delete blacklist entry'
    });
  }
};

module.exports = {
  getBlacklistEntries,
  getBlacklistEntryById,
  createBlacklistEntry,
  updateBlacklistEntry,
  deleteBlacklistEntry
};
