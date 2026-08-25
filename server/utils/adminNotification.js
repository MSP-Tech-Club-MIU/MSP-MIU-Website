const { QueryTypes } = require('sequelize');
const sequelize = require('../config/db');
const AdminNotification = require('../models/AdminNotification');
const { resolveSeasonIdForWrite, getDefaultSeasonId } = require('./seasonFilter');
const logger = require('./logger');

/**
 * Log an action performed by an admin or board member
 * @param {string} actionType - e.g. 'competition_created', 'event_updated', 'member_deleted'
 * @param {string} message - Human readable description of the action
 * @param {object} req - Express request object containing req.user and optionally req.boardMember
 * @param {string|null} entityType - e.g. 'competition', 'event', 'member', 'course', 'season', etc.
 * @param {number|string|null} entityId - Primary key ID of the affected entity
 * @param {number|null} seasonIdOverride - Explicit season_id if known
 */
async function logAdminAction(actionType, message, req, entityType = null, entityId = null, seasonIdOverride = null) {
    try {
        if (!req || !req.user || !req.user.user_id) {
            return null;
        }

        let boardMember = req.boardMember || null;
        if (!boardMember) {
            try {
                let defaultSeasonId = null;
                try {
                    defaultSeasonId = await getDefaultSeasonId();
                } catch (_) {
                    defaultSeasonId = null;
                }

                if (defaultSeasonId) {
                    const rows = await sequelize.query(
                        `SELECT board_id, full_name, position, department_id, year, email, user_id, season_id
                         FROM board
                         WHERE user_id = ? AND season_id = ?
                         LIMIT 1`,
                        {
                            replacements: [req.user.user_id, defaultSeasonId],
                            type: QueryTypes.SELECT
                        }
                    );
                    boardMember = rows[0] || null;
                }

                if (!boardMember) {
                    const rows = await sequelize.query(
                        `SELECT board_id, full_name, position, department_id, year, email, user_id, season_id
                         FROM board
                         WHERE user_id = ?
                         ORDER BY board_id DESC
                         LIMIT 1`,
                        {
                            replacements: [req.user.user_id],
                            type: QueryTypes.SELECT
                        }
                    );
                    boardMember = rows[0] || null;
                }
            } catch (_) {
                boardMember = null;
            }
        }

        let season_id = seasonIdOverride;
        if (!season_id) {
            try {
                season_id = await resolveSeasonIdForWrite(req.body || {}, req.query || {});
            } catch (_) {
                try {
                    season_id = await getDefaultSeasonId();
                } catch (_) {
                    season_id = null;
                }
            }
        }

        const performer_name =
            boardMember?.full_name ||
            req.user.full_name ||
            req.user.username ||
            req.user.email ||
            'Admin';

        let performer_position =
            boardMember?.position ||
            (req.user.role === 'admin' ? 'President' : req.user.role === 'board' ? 'Board' : req.user.role) ||
            'Admin';

        if (boardMember?.position === 'Head' && Number(boardMember?.department_id) === 1) {
            performer_position = 'Head of Software Development';
        }

        const notification = await AdminNotification.create({
            action_type: actionType,
            message: String(message || '').slice(0, 500),
            performed_by: req.user.user_id,
            performer_name,
            performer_position,
            entity_type: entityType,
            entity_id: entityId ? Number(entityId) : null,
            season_id: season_id ? Number(season_id) : null
        });

        return notification;
    } catch (err) {
        logger.error('Failed to log admin notification:', err);
        return null;
    }
}

module.exports = {
    logAdminAction
};
