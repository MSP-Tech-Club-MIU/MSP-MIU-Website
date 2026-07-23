const { QueryTypes } = require('sequelize');
const sequelize = require('../config/db');
const { getDefaultSeasonId } = require('../utils/seasonFilter');

/**
 * Admin Authorization Middleware
 * Allows President, Vice President, and Heads of Software Development (1)
 * or Technical Training (2) — only for Board rows in the active (default) season.
 * Must run after authenticateToken.
 */
const adminAuth = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication Required'
            });
        }

        let defaultSeasonId = null;
        try {
            defaultSeasonId = await getDefaultSeasonId();
        } catch (_) {
            defaultSeasonId = null;
        }

        let rows;
        if (defaultSeasonId) {
            rows = await sequelize.query(
                `SELECT board_id, full_name, position, department_id, year, email, user_id, season_id
                 FROM board
                 WHERE user_id = ? AND season_id = ?
                 LIMIT 1`,
                {
                    replacements: [req.user.user_id, defaultSeasonId],
                    type: QueryTypes.SELECT
                }
            );
        } else {
            // Bootstrap: no default season yet — allow any linked board row
            rows = await sequelize.query(
                `SELECT board_id, full_name, position, department_id, year, email, user_id, season_id
                 FROM board
                 WHERE user_id = ?
                 LIMIT 1`,
                {
                    replacements: [req.user.user_id],
                    type: QueryTypes.SELECT
                }
            );
        }

        const boardMember = rows[0];

        if (!boardMember) {
            return res.status(403).json({
                success: false,
                error: defaultSeasonId
                    ? 'Access denied. Admin Panel is restricted to board members of the current season.'
                    : 'Access denied. Admin Panel is restricted to board members linked to a user account.'
            });
        }

        const position = String(boardMember.position || '').trim();
        const departmentId = Number(boardMember.department_id);

        if (position === 'President' || position === 'Vice President') {
            req.boardMember = boardMember;
            return next();
        }

        if (position === 'Head' && (departmentId === 1 || departmentId === 2)) {
            req.boardMember = boardMember;
            return next();
        }

        return res.status(403).json({
            success: false,
            error: 'Access denied. Only President, Vice President, and Head of Software Development / Technical Training can access the admin panel.'
        });
    } catch (error) {
        console.error('Admin auth middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authorization error'
        });
    }
};

module.exports = { adminAuth };
