const { QueryTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * Admin Authorization Middleware
 * Allows President, Vice President, and Heads of Software Development (1)
 * or Technical Training (2). Must run after authenticateToken.
 *
 * Uses a raw SELECT of core columns so auth still works if optional CMS
 * columns (photo_url, is_visible, …) have not been migrated yet.
 */
const adminAuth = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication Required'
            });
        }

        const rows = await sequelize.query(
            `SELECT board_id, full_name, position, department_id, year, email, user_id
             FROM board
             WHERE user_id = ?
             LIMIT 1`,
            {
                replacements: [req.user.user_id],
                type: QueryTypes.SELECT
            }
        );

        const boardMember = rows[0];

        if (!boardMember) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Admin Panel is restricted to board members linked to a user account.'
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
