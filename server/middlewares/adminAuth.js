const { QueryTypes } = require('sequelize');
const sequelize = require('../config/db');
const { getDefaultSeasonId } = require('../utils/seasonFilter');
const { isAdminEligibleBoardMember } = require('../utils/adminEligibleBoard');
const { isProgramsEligibleBoardMember } = require('../utils/programsEligibleBoard');

async function loadCurrentSeasonBoardMember(userId) {
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
                replacements: [userId, defaultSeasonId],
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
                replacements: [userId],
                type: QueryTypes.SELECT
            }
        );
    }

    return { boardMember: rows[0] || null, defaultSeasonId };
}

function denyNoBoard(res, defaultSeasonId) {
    return res.status(403).json({
        success: false,
        error: defaultSeasonId
            ? 'Access denied. Admin Panel is restricted to board members of the current season.'
            : 'Access denied. Admin Panel is restricted to board members linked to a user account.'
    });
}

/**
 * Full Admin Panel access.
 * President, Vice President, or Head of Software Development (1).
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

        const { boardMember, defaultSeasonId } = await loadCurrentSeasonBoardMember(req.user.user_id);

        if (!boardMember) {
            return denyNoBoard(res, defaultSeasonId);
        }

        if (isAdminEligibleBoardMember(boardMember)) {
            req.boardMember = boardMember;
            return next();
        }

        return res.status(403).json({
            success: false,
            error: 'Access denied. Only President, Vice President, and Head of Software Development can access the full admin panel.'
        });
    } catch (error) {
        console.error('Admin auth middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authorization error'
        });
    }
};

/**
 * Full admin OR board member of a programs department
 * (Software Development, Technical Training, Artificial Intelligence, Cyber Security).
 * Used for competitions / attendance admin APIs needed by Programs tabs.
 */
const adminOrProgramsAuth = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication Required'
            });
        }

        const { boardMember, defaultSeasonId } = await loadCurrentSeasonBoardMember(req.user.user_id);

        if (!boardMember) {
            return denyNoBoard(res, defaultSeasonId);
        }

        if (isAdminEligibleBoardMember(boardMember) || isProgramsEligibleBoardMember(boardMember)) {
            req.boardMember = boardMember;
            return next();
        }

        return res.status(403).json({
            success: false,
            error: 'Access denied. Programs admin tools are restricted to eligible board members.'
        });
    } catch (error) {
        console.error('Admin or programs auth middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authorization error'
        });
    }
};

module.exports = { adminAuth, adminOrProgramsAuth, loadCurrentSeasonBoardMember };
