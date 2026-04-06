const db = require('../config/db');
const { Op } = require('sequelize');
const { Submission, Team, Evaluation, JudgeScore } = require('../models');
const { meanJudgeScore, computeFinalScore } = require('../utils/scoreCalculator');

/**
 * Get all competitions
 * GET /api/competitions
 * Public route - shows only open/finished competitions for regular users
 * Admin/board can see all competitions
 */
const getAllCompetitions = async (req, res) => {
    try {
        const { status } = req.query;
        const userRole = req.user?.role; // From JWT if authenticated

        let whereClause = {};

        // If user is not admin/board, only show non-draft competitions
        if (userRole !== 'admin' && userRole !== 'board') {
            whereClause.status = {
                [Op.ne]: 'draft'
            };
        }

        // Apply status filter if provided
        if (status) {
            const validStatuses = ['draft', 'open', 'locked', 'judging', 'finished'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: `Status must be one of: ${validStatuses.join(', ')}`
                });
            }
            whereClause.status = status;
        }

        // Build WHERE clause for SQL
        let sqlWhere = '1=1';
        let replacements = [];

        if (userRole !== 'admin' && userRole !== 'board' && !status) {
            sqlWhere = 'status != ?';
            replacements.push('draft');
        } else if (status) {
            sqlWhere = 'status = ?';
            replacements.push(status);
        }

        const competitions = await db.query(
            `SELECT 
                competition_id,
                title,
                description,
                rules,
                start_at,
                end_at,
                max_team_size,
                min_team_size,
                status,
                location_type,
                location_details,
                created_by,
                created_at
            FROM competitions
            WHERE ${sqlWhere}
            ORDER BY start_at DESC`,
            {
                replacements: replacements,
                type: db.QueryTypes.SELECT
            }
        );

        res.status(200).json({
            success: true,
            data: competitions
        });

    } catch (error) {
        console.error('Error fetching competitions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch competitions'
        });
    }
};

/**
 * Get competition by ID
 * GET /api/competitions/:id
 * Public route
 */
const getCompetitionById = async (req, res) => {
    try {
        const { id } = req.params;

        const competitions = await db.query(
            `SELECT 
                competition_id,
                title,
                description,
                rules,
                start_at,
                end_at,
                max_team_size,
                min_team_size,
                status,
                location_type,
                location_details,
                created_by,
                created_at
            FROM competitions
            WHERE competition_id = ?`,
            {
                replacements: [id],
                type: db.QueryTypes.SELECT
            }
        );

        if (!competitions || competitions.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Competition not found'
            });
        }

        res.status(200).json({
            success: true,
            data: competitions[0]
        });

    } catch (error) {
        console.error('Error fetching competition:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch competition'
        });
    }
};

/**
 * Get user's team for a specific competition
 * GET /api/competitions/:id/my-team
 * Authenticated route
 */
const getUserTeamForCompetition = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.user_id;

        const teams = await db.query(
            `SELECT 
                t.team_id,
                t.team_name,
                t.is_locked,
                t.created_at,
                tm.role as member_role
            FROM teams t
            INNER JOIN team_members tm ON t.team_id = tm.team_id
            WHERE t.competition_id = ? AND tm.user_id = ?
            LIMIT 1`,
            {
                replacements: [id, userId],
                type: db.QueryTypes.SELECT
            }
        );

        if (!teams || teams.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No team found for this competition'
            });
        }

        res.status(200).json({
            success: true,
            data: teams[0]
        });

    } catch (error) {
        console.error('Error fetching user team:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch team information'
        });
    }
};

/**
 * Create a new competition
 * POST /api/competitions
 * Admin/Board only
 */
const createCompetition = async (req, res) => {
    try {
        const {
            title,
            description,
            rules,
            start_at,
            end_at,
            max_team_size,
            min_team_size,
            status,
            location_type,
            location_details
        } = req.body;

        const created_by = req.user.user_id;

        // Validation
        if (!title || !start_at || !end_at || !max_team_size) {
            return res.status(400).json({
                success: false,
                error: 'Required fields: title, start_at, end_at, max_team_size'
            });
        }

        // Validate status
        const validStatuses = ['draft', 'open', 'locked', 'judging', 'finished'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Status must be one of: ${validStatuses.join(', ')}`
            });
        }

        // Validate location_type
        const validLocationTypes = ['on-campus', 'online'];
        if (location_type && !validLocationTypes.includes(location_type)) {
            return res.status(400).json({
                success: false,
                error: `Location type must be one of: ${validLocationTypes.join(', ')}`
            });
        }

        // Validate team size
        const minSize = min_team_size || 1;
        const maxSize = max_team_size;
        
        if (minSize > maxSize) {
            return res.status(400).json({
                success: false,
                error: 'min_team_size cannot be greater than max_team_size'
            });
        }

        // Validate dates
        const startDate = new Date(start_at);
        const endDate = new Date(end_at);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format for start_at or end_at'
            });
        }

        if (startDate >= endDate) {
            return res.status(400).json({
                success: false,
                error: 'start_at must be before end_at'
            });
        }

        // Insert competition
        const result = await db.query(
            `INSERT INTO competitions 
            (title, description, rules, start_at, end_at, max_team_size, min_team_size, status, location_type, location_details, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            {
                replacements: [
                    title,
                    description || null,
                    rules || null,
                    start_at,
                    end_at,
                    max_team_size,
                    min_team_size || 1,
                    status || 'draft',
                    location_type || 'on-campus',
                    location_details || null,
                    created_by
                ],
                type: db.QueryTypes.INSERT
            }
        );

        // Fetch the created competition
        const newCompetitions = await db.query(
            `SELECT * FROM competitions WHERE competition_id = ?`,
            {
                replacements: [result],
                type: db.QueryTypes.SELECT
            }
        );

        res.status(201).json({
            success: true,
            message: 'Competition created successfully',
            data: newCompetitions[0]
        });

    } catch (error) {
        console.error('Error creating competition:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create competition',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Update a competition
 * PUT /api/competitions/:id
 * Admin/Board only
 */
const updateCompetition = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            rules,
            start_at,
            end_at,
            max_team_size,
            min_team_size,
            status,
            location_type,
            location_details
        } = req.body;

        // Check if competition exists
        const existing = await db.query(
            `SELECT competition_id FROM competitions WHERE competition_id = ?`,
            {
                replacements: [id],
                type: db.QueryTypes.SELECT
            }
        );

        if (!existing || existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Competition not found'
            });
        }

        // Validate status if provided
        if (status) {
            const validStatuses = ['draft', 'open', 'locked', 'judging', 'finished'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: `Status must be one of: ${validStatuses.join(', ')}`
                });
            }
        }

        // Validate location_type if provided
        if (location_type) {
            const validLocationTypes = ['on-campus', 'online'];
            if (!validLocationTypes.includes(location_type)) {
                return res.status(400).json({
                    success: false,
                    error: `Location type must be one of: ${validLocationTypes.join(', ')}`
                });
            }
        }

        // Validate team size if provided
        if (min_team_size && max_team_size && min_team_size > max_team_size) {
            return res.status(400).json({
                success: false,
                error: 'min_team_size cannot be greater than max_team_size'
            });
        }

        // Validate dates if provided
        if (start_at && end_at) {
            const startDate = new Date(start_at);
            const endDate = new Date(end_at);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid date format for start_at or end_at'
                });
            }

            if (startDate >= endDate) {
                return res.status(400).json({
                    success: false,
                    error: 'start_at must be before end_at'
                });
            }
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (title !== undefined) {
            updates.push('title = ?');
            values.push(title);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (rules !== undefined) {
            updates.push('rules = ?');
            values.push(rules);
        }
        if (start_at !== undefined) {
            updates.push('start_at = ?');
            values.push(start_at);
        }
        if (end_at !== undefined) {
            updates.push('end_at = ?');
            values.push(end_at);
        }
        if (max_team_size !== undefined) {
            updates.push('max_team_size = ?');
            values.push(max_team_size);
        }
        if (min_team_size !== undefined) {
            updates.push('min_team_size = ?');
            values.push(min_team_size);
        }
        if (status !== undefined) {
            updates.push('status = ?');
            values.push(status);
        }
        if (location_type !== undefined) {
            updates.push('location_type = ?');
            values.push(location_type);
        }
        if (location_details !== undefined) {
            updates.push('location_details = ?');
            values.push(location_details);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No fields to update'
            });
        }

        values.push(id);

        await db.query(
            `UPDATE competitions SET ${updates.join(', ')} WHERE competition_id = ?`,
            {
                replacements: values,
                type: db.QueryTypes.UPDATE
            }
        );

        // Fetch updated competition
        const updated = await db.query(
            `SELECT * FROM competitions WHERE competition_id = ?`,
            {
                replacements: [id],
                type: db.QueryTypes.SELECT
            }
        );

        res.status(200).json({
            success: true,
            message: 'Competition updated successfully',
            data: updated[0]
        });

    } catch (error) {
        console.error('Error updating competition:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update competition',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Delete a competition
 * DELETE /api/competitions/:id
 * Admin only
 */
const deleteCompetition = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if competition exists
        const existing = await db.query(
            `SELECT competition_id FROM competitions WHERE competition_id = ?`,
            {
                replacements: [id],
                type: db.QueryTypes.SELECT
            }
        );

        if (!existing || existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Competition not found'
            });
        }

        // Check if there are teams registered (optional - you may want to allow deletion)
        const teams = await db.query(
            `SELECT COUNT(*) as count FROM teams WHERE competition_id = ?`,
            {
                replacements: [id],
                type: db.QueryTypes.SELECT
            }
        );

        if (teams[0].count > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete competition with registered teams',
                details: `${teams[0].count} team(s) are registered for this competition`
            });
        }

        // Delete competition
        await db.query(
            `DELETE FROM competitions WHERE competition_id = ?`,
            {
                replacements: [id],
                type: db.QueryTypes.DELETE
            }
        );

        res.status(200).json({
            success: true,
            message: 'Competition deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting competition:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete competition',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Public leaderboard for a competition: teams ranked by combined auto + judge score.
 * GET /api/competitions/:id/leaderboard
 */
const getCompetitionLeaderboard = async (req, res) => {
    try {
        const { id } = req.params;
        const competitionId = parseInt(id, 10);
        if (Number.isNaN(competitionId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid competition id'
            });
        }

        const existing = await db.query(
            `SELECT competition_id FROM competitions WHERE competition_id = ?`,
            {
                replacements: [competitionId],
                type: db.QueryTypes.SELECT
            }
        );

        if (!existing || existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Competition not found'
            });
        }

        const rows = await db.query(
            `SELECT
                t.team_id,
                t.team_name,
                s.submission_id,
                e.total_auto_score,
                js.design_score,
                js.creativity_score,
                js.ux_score,
                js.innovation_score
            FROM teams t
            INNER JOIN submissions s
                ON s.team_id = t.team_id
                AND s.competition_id = ?
                AND s.submission_id = (
                    SELECT MAX(s2.submission_id)
                    FROM submissions s2
                    WHERE s2.team_id = t.team_id AND s2.competition_id = ?
                )
            LEFT JOIN evaluations e ON e.submission_id = s.submission_id
            LEFT JOIN judge_scores js ON js.submission_id = s.submission_id
            WHERE t.competition_id = ?
            ORDER BY t.team_id, js.judge_score_id`,
            {
                replacements: [competitionId, competitionId, competitionId],
                type: db.QueryTypes.SELECT
            }
        );

        const byTeam = new Map();
        for (const row of rows) {
            const tid = row.team_id;
            if (!byTeam.has(tid)) {
                byTeam.set(tid, {
                    team_id: tid,
                    team_name: row.team_name,
                    submission_id: row.submission_id,
                    total_auto_score:
                        row.total_auto_score != null
                            ? parseFloat(row.total_auto_score, 10)
                            : null,
                    judgeRows: []
                });
            }
            const entry = byTeam.get(tid);
            if (
                row.design_score != null &&
                row.creativity_score != null &&
                row.ux_score != null &&
                row.innovation_score != null
            ) {
                entry.judgeRows.push({
                    design_score: parseFloat(row.design_score, 10),
                    creativity_score: parseFloat(row.creativity_score, 10),
                    ux_score: parseFloat(row.ux_score, 10),
                    innovation_score: parseFloat(row.innovation_score, 10)
                });
            }
        }

        const leaderboard = [];
        for (const entry of byTeam.values()) {
            const judgeAvg = meanJudgeScore(entry.judgeRows);
            const finalScore = computeFinalScore(entry.total_auto_score, judgeAvg);
            leaderboard.push({
                rank: 0,
                team_id: entry.team_id,
                team_name: entry.team_name,
                submission_id: entry.submission_id,
                total_auto_score: entry.total_auto_score,
                judge_average: judgeAvg,
                final_score: finalScore
            });
        }

        leaderboard.sort((a, b) => {
            const fa = a.final_score;
            const fb = b.final_score;
            if (fa == null && fb == null) {
                return (a.team_name || '').localeCompare(b.team_name || '');
            }
            if (fa == null) return 1;
            if (fb == null) return -1;
            if (fb !== fa) return fb - fa;
            return (a.team_name || '').localeCompare(b.team_name || '');
        });

        leaderboard.forEach((row, i) => {
            row.rank = i + 1;
        });

        res.status(200).json({
            success: true,
            data: leaderboard
        });
    } catch (error) {
        console.error('Error fetching competition leaderboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch leaderboard'
        });
    }
};

module.exports = {
    getAllCompetitions,
    getCompetitionById,
    getCompetitionLeaderboard,
    getUserTeamForCompetition,
    createCompetition,
    updateCompetition,
    deleteCompetition
};
