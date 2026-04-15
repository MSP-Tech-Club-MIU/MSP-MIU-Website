const db = require('../config/db');
const { Op } = require('sequelize');
const { Submission, Team, Evaluation, JudgeScore } = require('../models');
const { ensureQuizForCompetition } = require('../utils/ensureQuizForCompetition');
const { meanJudgeScore, computeFinalScore } = require('../utils/scoreCalculator');

const VALID_COMP_TYPES = ['project', 'quiz', 'external', 'task_quiz'];
const VALID_SUBMISSION_MODES = ['none', 'upload', 'link', 'both'];
const VALID_EVALUATION_MODES = ['none', 'manual', 'auto', 'hybrid'];

function normalizeConfigForWrite(config) {
    if (config === undefined) return undefined;
    if (config === null) return null;
    if (typeof config === 'string') return config;
    return JSON.stringify(config);
}

function parseCompetitionConfig(competition) {
    if (!competition) return competition;
    if (typeof competition.config === 'string') {
        try {
            competition.config = JSON.parse(competition.config);
        } catch (_) {
            competition.config = null;
        }
    }
    if ('is_team_based' in competition && competition.is_team_based != null) {
        competition.is_team_based = Boolean(Number(competition.is_team_based));
    }
    return competition;
}

function coerceIsTeamBased(value, defaultValue = true) {
    if (value === undefined) return defaultValue;
    if (value === null) return defaultValue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        const s = value.toLowerCase();
        if (s === 'false' || s === '0') return false;
        if (s === 'true' || s === '1') return true;
    }
    return defaultValue;
}

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
                is_team_based,
                status,
                location_type,
                location_details,
                type,
                submission_mode,
                evaluation_mode,
                config,
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

        const normalizedCompetitions = competitions.map(parseCompetitionConfig);
        res.status(200).json({
            success: true,
            data: normalizedCompetitions
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
                c.competition_id,
                c.title,
                c.description,
                c.rules,
                c.start_at,
                c.end_at,
                c.max_team_size,
                c.min_team_size,
                c.is_team_based,
                c.status,
                c.location_type,
                c.location_details,
                c.type,
                c.submission_mode,
                c.evaluation_mode,
                c.config,
                c.created_by,
                c.created_at,
                q.status AS quiz_status
            FROM competitions c
            LEFT JOIN quizzes q ON q.competition_id = c.competition_id
            WHERE c.competition_id = ?`,
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

        const normalizedCompetition = parseCompetitionConfig(competitions[0]);
        res.status(200).json({
            success: true,
            data: normalizedCompetition
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
            is_team_based,
            status,
            location_type,
            location_details,
            type,
            submission_mode,
            evaluation_mode,
            config
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

        const resolvedType = type || 'project';
        const resolvedSubmissionMode = submission_mode || 'upload';
        const resolvedEvaluationMode = evaluation_mode || 'manual';

        if (!VALID_COMP_TYPES.includes(resolvedType)) {
            return res.status(400).json({
                success: false,
                error: `type must be one of: ${VALID_COMP_TYPES.join(', ')}`
            });
        }
        if (!VALID_SUBMISSION_MODES.includes(resolvedSubmissionMode)) {
            return res.status(400).json({
                success: false,
                error: `submission_mode must be one of: ${VALID_SUBMISSION_MODES.join(', ')}`
            });
        }
        if (!VALID_EVALUATION_MODES.includes(resolvedEvaluationMode)) {
            return res.status(400).json({
                success: false,
                error: `evaluation_mode must be one of: ${VALID_EVALUATION_MODES.join(', ')}`
            });
        }

        if (resolvedType === 'task_quiz' && !['upload', 'link', 'both'].includes(resolvedSubmissionMode)) {
            return res.status(400).json({
                success: false,
                error: 'task_quiz competitions must use submission_mode upload, link, or both'
            });
        }

        if ((resolvedType === 'external' || resolvedType === 'quiz') && resolvedSubmissionMode !== 'none') {
            return res.status(400).json({
                success: false,
                error: `${resolvedType} competitions must use submission_mode = none`
            });
        }
        if ((resolvedType === 'external' || resolvedType === 'quiz') && resolvedEvaluationMode !== 'none') {
            return res.status(400).json({
                success: false,
                error: `${resolvedType} competitions must use evaluation_mode = none`
            });
        }

        const effectiveIsTeamBased = coerceIsTeamBased(is_team_based, true);

        // Validate team size (non-team-based / solo: exactly one slot)
        let minSize = min_team_size || 1;
        let maxSize = max_team_size;
        if (!effectiveIsTeamBased) {
            minSize = 1;
            maxSize = 1;
        }

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

        const serializedConfig = normalizeConfigForWrite(config || null);

        // Insert competition
        const result = await db.query(
            `INSERT INTO competitions 
            (title, description, rules, start_at, end_at, max_team_size, min_team_size, is_team_based, status, location_type, location_details, type, submission_mode, evaluation_mode, config, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            {
                replacements: [
                    title,
                    description || null,
                    rules || null,
                    start_at,
                    end_at,
                    maxSize,
                    minSize,
                    effectiveIsTeamBased,
                    status || 'draft',
                    location_type || 'on-campus',
                    location_details || null,
                    resolvedType,
                    resolvedSubmissionMode,
                    resolvedEvaluationMode,
                    serializedConfig,
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

        const normalizedCompetition = parseCompetitionConfig(newCompetitions[0]);
        await ensureQuizForCompetition(normalizedCompetition, created_by);
        res.status(201).json({
            success: true,
            message: 'Competition created successfully',
            data: normalizedCompetition
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
            is_team_based,
            status,
            location_type,
            location_details,
            type,
            submission_mode,
            evaluation_mode,
            config
        } = req.body;

        const soloFromBody = is_team_based !== undefined && !coerceIsTeamBased(is_team_based);

        // Check if competition exists
        const existing = await db.query(
            `SELECT competition_id, type FROM competitions WHERE competition_id = ?`,
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

        if (type && !VALID_COMP_TYPES.includes(type)) {
            return res.status(400).json({
                success: false,
                error: `type must be one of: ${VALID_COMP_TYPES.join(', ')}`
            });
        }
        if (submission_mode && !VALID_SUBMISSION_MODES.includes(submission_mode)) {
            return res.status(400).json({
                success: false,
                error: `submission_mode must be one of: ${VALID_SUBMISSION_MODES.join(', ')}`
            });
        }
        if (evaluation_mode && !VALID_EVALUATION_MODES.includes(evaluation_mode)) {
            return res.status(400).json({
                success: false,
                error: `evaluation_mode must be one of: ${VALID_EVALUATION_MODES.join(', ')}`
            });
        }

        // Enforce invariants for restrictive competition types (current or requested)
        const effectiveType = type || existing[0].type;
        if (effectiveType === 'task_quiz' && submission_mode && !['upload', 'link', 'both'].includes(submission_mode)) {
            return res.status(400).json({
                success: false,
                error: 'task_quiz competitions must use submission_mode upload, link, or both'
            });
        }
        if (effectiveType === 'external' || effectiveType === 'quiz') {
            if (submission_mode !== undefined && submission_mode !== 'none') {
                return res.status(400).json({
                    success: false,
                    error: `${effectiveType} competitions must use submission_mode = none`
                });
            }
            if (evaluation_mode !== undefined && evaluation_mode !== 'none') {
                return res.status(400).json({
                    success: false,
                    error: `${effectiveType} competitions must use evaluation_mode = none`
                });
            }
        }

        // Validate team size if provided (skip cross-check when switching to non-team-based; sizes are forced to 1)
        if (!soloFromBody && min_team_size && max_team_size && min_team_size > max_team_size) {
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
        if (max_team_size !== undefined && !soloFromBody) {
            updates.push('max_team_size = ?');
            values.push(max_team_size);
        }
        if (min_team_size !== undefined && !soloFromBody) {
            updates.push('min_team_size = ?');
            values.push(min_team_size);
        }
        if (is_team_based !== undefined) {
            const itb = coerceIsTeamBased(is_team_based);
            updates.push('is_team_based = ?');
            values.push(itb);
            if (!itb) {
                updates.push('min_team_size = ?');
                values.push(1);
                updates.push('max_team_size = ?');
                values.push(1);
            }
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
        if (type !== undefined) {
            updates.push('type = ?');
            values.push(type);
        }
        if (submission_mode !== undefined) {
            updates.push('submission_mode = ?');
            values.push(submission_mode);
        }
        if (evaluation_mode !== undefined) {
            updates.push('evaluation_mode = ?');
            values.push(evaluation_mode);
        }
        if (config !== undefined) {
            updates.push('config = ?');
            values.push(normalizeConfigForWrite(config));
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

        const normalizedCompetition = parseCompetitionConfig(updated[0]);
        await ensureQuizForCompetition(normalizedCompetition, req.user.user_id);
        res.status(200).json({
            success: true,
            message: 'Competition updated successfully',
            data: normalizedCompetition
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
            `SELECT competition_id, type, evaluation_mode FROM competitions WHERE competition_id = ?`,
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
            `SELECT competition_id, type, evaluation_mode FROM competitions WHERE competition_id = ?`,
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

        const competition = existing[0];
        if (competition.type === 'quiz') {
            const quizRows = await db.query(
                `SELECT
                    qa.user_id,
                    u.full_name AS participant_name,
                    MAX(qa.score) AS final_score
                FROM quiz_attempts qa
                INNER JOIN quizzes q ON q.quiz_id = qa.quiz_id
                INNER JOIN users u ON u.user_id = qa.user_id
                WHERE q.competition_id = ?
                GROUP BY qa.user_id, u.full_name
                ORDER BY final_score DESC, participant_name ASC`,
                {
                    replacements: [competitionId],
                    type: db.QueryTypes.SELECT
                }
            );
            const data = quizRows.map((row, idx) => ({
                rank: idx + 1,
                participant_id: row.user_id,
                participant_name: row.participant_name,
                final_score: row.final_score != null ? parseFloat(row.final_score) : null
            }));
            return res.status(200).json({ success: true, data });
        }

        if (competition.type === 'task_quiz') {
            const taskRows = await db.query(
                `SELECT
                    t.team_id,
                    t.team_name,
                    SUM(COALESCE(s.score, e.total_auto_score, 0)) AS final_score
                FROM teams t
                LEFT JOIN submissions s
                    ON s.team_id = t.team_id AND s.competition_id = ? AND s.task_id IS NOT NULL
                LEFT JOIN evaluations e ON e.submission_id = s.submission_id
                WHERE t.competition_id = ?
                GROUP BY t.team_id, t.team_name
                ORDER BY final_score DESC, t.team_name ASC`,
                {
                    replacements: [competitionId, competitionId],
                    type: db.QueryTypes.SELECT
                }
            );
            const data = taskRows.map((row, idx) => ({
                rank: idx + 1,
                team_id: row.team_id,
                team_name: row.team_name,
                final_score: row.final_score != null ? parseFloat(row.final_score, 10) : 0
            }));
            return res.status(200).json({ success: true, data });
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
                AND s.task_id IS NULL
                AND s.submission_id = (
                    SELECT MAX(s2.submission_id)
                    FROM submissions s2
                    WHERE s2.team_id = t.team_id AND s2.competition_id = ? AND s2.task_id IS NULL
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
            const finalScore = competition.evaluation_mode === 'hybrid'
                ? computeFinalScore(entry.total_auto_score, judgeAvg)
                : (entry.total_auto_score ?? judgeAvg);
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
