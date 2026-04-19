const db = require('../config/db');
const { uploadToR2 } = require('../config/cloud');
const { runEvaluationForSubmission } = require('../services/evaluationRunner');
const { normalizeInsertId } = require('../utils/normalizeInsertId');

/**
 * Submit team work (ZIP file and/or links)
 * POST /api/submissions
 * Authenticated route (team members only)
 */
const createSubmission = async (req, res) => {
    try {
        const { competition_id, team_id, submit_type, repo_url, live_url, notes, task_id: taskIdBody } = req.body;
        const userId = req.user.user_id;
        const taskIdParsed =
            taskIdBody != null && taskIdBody !== ''
                ? parseInt(String(taskIdBody), 10)
                : null;

        // Validation
        if (!competition_id || !team_id || !submit_type) {
            return res.status(400).json({
                success: false,
                error: 'Required fields: competition_id, team_id, submit_type'
            });
        }

        const validSubmitTypes = ['zip', 'links', 'zip_and_links'];
        if (!validSubmitTypes.includes(submit_type)) {
            return res.status(400).json({
                success: false,
                error: `submit_type must be one of: ${validSubmitTypes.join(', ')}`
            });
        }

        // Check if user is team member
        const teamMembers = await db.query(
            `SELECT tm.team_member_id, tm.role, t.is_locked
             FROM team_members tm
             INNER JOIN teams t ON tm.team_id = t.team_id
             WHERE tm.team_id = ? AND tm.user_id = ?`,
            {
                replacements: [team_id, userId],
                type: db.QueryTypes.SELECT
            }
        );

        if (!teamMembers || teamMembers.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'You are not a member of this team'
            });
        }
        const membership = teamMembers[0];

        // Check competition status
        const competitions = await db.query(
            `SELECT status, end_at, type, submission_mode, evaluation_mode FROM competitions WHERE competition_id = ?`,
            {
                replacements: [competition_id],
                type: db.QueryTypes.SELECT
            }
        );

        if (!competitions || competitions.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Competition not found'
            });
        }

        const competition = competitions[0];

        if (['project', 'task_quiz'].includes(competition.type) && membership.role !== 'leader') {
            return res.status(403).json({
                success: false,
                error: 'Only the team leader can submit for this competition type'
            });
        }

        if (competition.type === 'quiz') {
            return res.status(400).json({
                success: false,
                error: 'Quiz competitions use quiz attempts and do not accept submissions'
            });
        }

        if (competition.type === 'task_quiz') {
            if (taskIdParsed == null || Number.isNaN(taskIdParsed)) {
                return res.status(400).json({
                    success: false,
                    error: 'task_id is required for task quiz competitions'
                });
            }
            const validTask = await db.query(
                `SELECT task_id FROM competition_tasks WHERE task_id = ? AND competition_id = ? LIMIT 1`,
                {
                    replacements: [taskIdParsed, competition_id],
                    type: db.QueryTypes.SELECT
                }
            );
            if (!validTask || validTask.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid task_id for this competition'
                });
            }
        } else if (taskIdParsed != null && !Number.isNaN(taskIdParsed)) {
            return res.status(400).json({
                success: false,
                error: 'task_id is only allowed for task quiz competitions'
            });
        }

        // Task quiz access rule for submissions:
        // allow only when quiz status is `active` OR quiz.start_at has been reached,
        // and still before quiz.end_at.
        if (competition.type === 'task_quiz') {
            const quizRows = await db.query(
                `SELECT status, start_at, end_at
                 FROM quizzes
                 WHERE competition_id = ?
                 LIMIT 1`,
                {
                    replacements: [competition_id],
                    type: db.QueryTypes.SELECT
                }
            );

            const quiz = quizRows && quizRows.length ? quizRows[0] : null;
            if (!quiz) {
                return res.status(403).json({
                    success: false,
                    error: 'Task quiz is not available yet'
                });
            }

            const now = new Date();
            const quizStart = new Date(quiz.start_at);
            const quizEnd = new Date(quiz.end_at);
            const startOk =
                quiz.status === 'active' || (!Number.isNaN(quizStart.getTime()) && now >= quizStart);
            const endOk = !Number.isNaN(quizEnd.getTime()) && now < quizEnd;

            if (!startOk || !endOk) {
                return res.status(403).json({
                    success: false,
                    error: 'Task quiz submissions are locked until the quiz starts (and they end at the scheduled end time).'
                });
            }
        }

        if (competition.type === 'external' || competition.submission_mode === 'none') {
            return res.status(400).json({
                success: false,
                error: 'This competition does not accept submissions'
            });
        }

        if (competition.status === 'draft') {
            return res.status(400).json({
                success: false,
                error: 'Competition has not started yet'
            });
        }

        if (competition.status === 'finished') {
            return res.status(400).json({
                success: false,
                error: 'Competition has ended'
            });
        }

        // Check if submission deadline passed
        if (competition.type !== 'task_quiz' && new Date() > new Date(competition.end_at)) {
            return res.status(400).json({
                success: false,
                error: 'Submission deadline has passed'
            });
        }

        // Validate submit_type against competition submission_mode
        const allowedByMode = {
            upload: ['zip'],
            link: ['links'],
            both: ['zip', 'links', 'zip_and_links']
        };
        const allowedTypes = allowedByMode[competition.submission_mode] || [];
        if (!allowedTypes.includes(submit_type)) {
            return res.status(400).json({
                success: false,
                error: `submit_type ${submit_type} is not allowed for submission_mode=${competition.submission_mode}`
            });
        }

        if ((submit_type === 'links' || submit_type === 'zip_and_links') && (!repo_url && !live_url)) {
            return res.status(400).json({
                success: false,
                error: 'At least one link (repo_url or live_url) is required'
            });
        }

        // Check if submission already exists (per team; per task for task_quiz)
        let existingSql =
            `SELECT submission_id, r2_key FROM submissions 
             WHERE competition_id = ? AND team_id = ?`;
        const existingRepl = [competition_id, team_id];
        if (competition.type === 'task_quiz') {
            existingSql += ` AND task_id = ?`;
            existingRepl.push(taskIdParsed);
        } else {
            existingSql += ` AND task_id IS NULL`;
        }
        const existingSubmissions = await db.query(existingSql, {
            replacements: existingRepl,
            type: db.QueryTypes.SELECT
        });

        if (existingSubmissions && existingSubmissions.length > 0) {
            if ((submit_type === 'zip' || submit_type === 'zip_and_links') && !req.file && !existingSubmissions[0].r2_key) {
                return res.status(400).json({
                    success: false,
                    error: 'ZIP file is required for this submission type'
                });
            }

            let r2Key = null;
            if (req.file && (submit_type === 'zip' || submit_type === 'zip_and_links')) {
                try {
                    const fileName = `competitions/${competition_id}/submissions/${existingSubmissions[0].submission_id}/submission.zip`;
                    const uploadResult = await uploadToR2(req.file.buffer, fileName, req.file.mimetype || 'application/zip');
                    r2Key = uploadResult.key;
                } catch (uploadError) {
                    console.error('Error uploading file to R2:', uploadError);
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to upload file'
                    });
                }
            }

            // Update existing submission
            await db.query(
                `UPDATE submissions 
                 SET submit_type = ?, r2_key = COALESCE(?, r2_key), repo_url = ?, live_url = ?, notes = ?, 
                     status = 'submitted', submitted_at = NOW()
                 WHERE submission_id = ?`,
                {
                    replacements: [
                        submit_type,
                        r2Key,
                        repo_url || null,
                        live_url || null,
                        notes || null,
                        existingSubmissions[0].submission_id
                    ],
                    type: db.QueryTypes.UPDATE
                }
            );

            const updatedSubmissions = await db.query(
                `SELECT * FROM submissions WHERE submission_id = ?`,
                {
                    replacements: [existingSubmissions[0].submission_id],
                    type: db.QueryTypes.SELECT
                }
            );

            const updatedRow = updatedSubmissions[0];
            if (
                (competition.evaluation_mode === 'auto' || competition.evaluation_mode === 'hybrid') &&
                updatedRow.r2_key
            ) {
                runEvaluationForSubmission(existingSubmissions[0].submission_id).catch((err) => {
                    console.error('Auto evaluation failed:', err.message);
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Submission updated successfully',
                data: updatedSubmissions[0]
            });
        }

        if ((submit_type === 'zip' || submit_type === 'zip_and_links') && !req.file) {
            return res.status(400).json({
                success: false,
                error: 'ZIP file is required for this submission type'
            });
        }

        // Create new submission
        const insertTaskId = competition.type === 'task_quiz' ? taskIdParsed : null;
        const result = await db.query(
            `INSERT INTO submissions 
             (competition_id, team_id, task_id, submit_type, r2_key, repo_url, live_url, notes, status)
             VALUES (?, ?, ?, ?, NULL, ?, ?, ?, 'submitted')`,
            {
                replacements: [
                    competition_id,
                    team_id,
                    insertTaskId,
                    submit_type,
                    repo_url || null,
                    live_url || null,
                    notes || null
                ],
                type: db.QueryTypes.INSERT
            }
        );

        const submissionId = normalizeInsertId(result);
        if (!Number.isFinite(submissionId)) {
            console.error('Failed to resolve submission insert id:', result);
            return res.status(500).json({
                success: false,
                error: 'Failed to resolve created submission id'
            });
        }

        if (req.file && (submit_type === 'zip' || submit_type === 'zip_and_links')) {
            try {
                const fileName = `competitions/${competition_id}/submissions/${submissionId}/submission.zip`;
                const uploadResult = await uploadToR2(req.file.buffer, fileName, req.file.mimetype || 'application/zip');
                await db.query(
                    `UPDATE submissions SET r2_key = ? WHERE submission_id = ?`,
                    {
                        replacements: [uploadResult.key, submissionId],
                        type: db.QueryTypes.UPDATE
                    }
                );
            } catch (uploadError) {
                console.error('Error uploading file to R2:', uploadError);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to upload file'
                });
            }
        }

        const newSubmissions = await db.query(
            `SELECT * FROM submissions WHERE submission_id = ?`,
            {
                replacements: [submissionId],
                type: db.QueryTypes.SELECT
            }
        );

        const createdRow = newSubmissions[0];
        if (
            (competition.evaluation_mode === 'auto' || competition.evaluation_mode === 'hybrid') &&
            createdRow.r2_key
        ) {
            runEvaluationForSubmission(submissionId).catch((err) => {
                console.error('Auto evaluation failed:', err.message);
            });
        }

        res.status(201).json({
            success: true,
            message: 'Submission created successfully',
            data: newSubmissions[0]
        });

    } catch (error) {
        console.error('Error creating submission:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create submission',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

async function getCompetitionJudgingEligibility(competitionId) {
    const rows = await db.query(
        `SELECT competition_id, type, evaluation_mode
         FROM competitions
         WHERE competition_id = ?
         LIMIT 1`,
        {
            replacements: [competitionId],
            type: db.QueryTypes.SELECT
        }
    );
    if (!rows || rows.length === 0) return null;
    return rows[0];
}

/**
 * Get team's submission for a competition
 * GET /api/submissions/competitions/:competitionId/teams/:teamId
 * Authenticated — team members or admin/board
 */
const getTeamSubmission = async (req, res) => {
    try {
        const { competitionId, teamId } = req.params;
        const userId = req.user.user_id;
        const isPrivileged = ['admin', 'board'].includes(req.user.role);

        if (!isPrivileged) {
            const membership = await db.query(
                `SELECT tm.team_member_id
                 FROM team_members tm
                 INNER JOIN teams t ON tm.team_id = t.team_id
                 WHERE tm.team_id = ? AND tm.user_id = ? AND t.competition_id = ?`,
                {
                    replacements: [teamId, userId, competitionId],
                    type: db.QueryTypes.SELECT
                }
            );
            if (!membership || membership.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }
        }

        const compRows = await db.query(
            `SELECT type FROM competitions WHERE competition_id = ? LIMIT 1`,
            {
                replacements: [competitionId],
                type: db.QueryTypes.SELECT
            }
        );
        const compType = compRows?.[0]?.type;
        const taskIdQ =
            req.query.task_id != null && req.query.task_id !== ''
                ? parseInt(String(req.query.task_id), 10)
                : null;
        if (compType === 'task_quiz') {
            if (taskIdQ == null || Number.isNaN(taskIdQ)) {
                return res.status(400).json({
                    success: false,
                    error: 'Query parameter task_id is required for task quiz competitions'
                });
            }
        }

        // Task quiz access rule for viewing submissions:
        // allow only after quiz unlocks (quiz.status === 'active' OR quiz.start_at reached).
        if (compType === 'task_quiz' && !isPrivileged) {
            const quizRows = await db.query(
                `SELECT status, start_at
                 FROM quizzes
                 WHERE competition_id = ?
                 LIMIT 1`,
                {
                    replacements: [competitionId],
                    type: db.QueryTypes.SELECT
                }
            );

            const quiz = quizRows && quizRows.length ? quizRows[0] : null;
            if (!quiz) {
                return res.status(403).json({
                    success: false,
                    error: 'Task quiz is not available yet'
                });
            }

            const now = new Date();
            const quizStart = new Date(quiz.start_at);
            const unlocked =
                quiz.status === 'active' || (!Number.isNaN(quizStart.getTime()) && now >= quizStart);

            if (!unlocked) {
                return res.status(403).json({
                    success: false,
                    error: 'Task quiz is not available yet'
                });
            }
        }

        let subSql = `SELECT s.*, t.team_name
             FROM submissions s
             INNER JOIN teams t ON s.team_id = t.team_id
             WHERE s.competition_id = ? AND s.team_id = ?`;
        const subRepl = [competitionId, teamId];
        if (compType === 'task_quiz') {
            subSql += ` AND s.task_id = ?`;
            subRepl.push(taskIdQ);
        } else {
            subSql += ` AND s.task_id IS NULL`;
        }

        const submissions = await db.query(subSql, {
            replacements: subRepl,
            type: db.QueryTypes.SELECT
        });

        if (!submissions || submissions.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No submission found'
            });
        }

        res.status(200).json({
            success: true,
            data: submissions[0]
        });

    } catch (error) {
        console.error('Error fetching submission:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch submission'
        });
    }
};

/**
 * Get all submissions for a competition (admin/board only)
 * GET /api/competitions/:competitionId/submissions
 * Authenticated route (admin/board)
 */
const getCompetitionSubmissions = async (req, res) => {
    try {
        const { competitionId } = req.params;
        const competition = await getCompetitionJudgingEligibility(competitionId);

        if (!competition) {
            return res.status(404).json({
                success: false,
                error: 'Competition not found'
            });
        }

        if (!['project', 'task_quiz'].includes(competition.type)) {
            return res.status(400).json({
                success: false,
                error: 'Judging is available only for project and task_quiz competitions'
            });
        }

        if (!['manual', 'hybrid'].includes(competition.evaluation_mode)) {
            return res.status(400).json({
                success: false,
                error: 'Judging is available only when evaluation_mode is manual or hybrid'
            });
        }

        const submissions = await db.query(
            `SELECT s.*, t.team_name, 
                    COUNT(tm.team_member_id) as team_size
             FROM submissions s
             INNER JOIN teams t ON s.team_id = t.team_id
             LEFT JOIN team_members tm ON t.team_id = tm.team_id
             WHERE s.competition_id = ?
             GROUP BY s.submission_id
             ORDER BY s.submitted_at DESC`,
            {
                replacements: [competitionId],
                type: db.QueryTypes.SELECT
            }
        );

        res.status(200).json({
            success: true,
            data: submissions
        });

    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch submissions'
        });
    }
};

/**
 * Grade a submission (admin/board only)
 * PUT /api/submissions/:id/grade
 * Authenticated route (admin/board)
 */
const gradeSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const { score, feedback } = req.body;
        const numericScore = Number(score);

        if (score === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Score is required'
            });
        }

        if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100) {
            return res.status(400).json({
                success: false,
                error: 'Score must be between 0 and 100'
            });
        }

        const subRows = await db.query(
            `SELECT submission_id, competition_id FROM submissions WHERE submission_id = ? LIMIT 1`,
            {
                replacements: [id],
                type: db.QueryTypes.SELECT
            }
        );
        if (!subRows || subRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Submission not found'
            });
        }

        const competition = await getCompetitionJudgingEligibility(subRows[0].competition_id);
        if (!competition) {
            return res.status(404).json({
                success: false,
                error: 'Competition not found'
            });
        }
        if (!['project', 'task_quiz'].includes(competition.type)) {
            return res.status(400).json({
                success: false,
                error: 'Judging is available only for project and task_quiz competitions'
            });
        }
        if (!['manual', 'hybrid'].includes(competition.evaluation_mode)) {
            return res.status(400).json({
                success: false,
                error: 'Judging is available only when evaluation_mode is manual or hybrid'
            });
        }

        await db.query(
            `UPDATE submissions 
             SET score = ?, feedback = ?, status = 'judged'
             WHERE submission_id = ?`,
            {
                replacements: [numericScore, feedback || null, id],
                type: db.QueryTypes.UPDATE
            }
        );

        const gradedSubmissions = await db.query(
            `SELECT * FROM submissions WHERE submission_id = ?`,
            {
                replacements: [id],
                type: db.QueryTypes.SELECT
            }
        );

        res.status(200).json({
            success: true,
            message: 'Submission graded successfully',
            data: gradedSubmissions[0]
        });

    } catch (error) {
        console.error('Error grading submission:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to grade submission'
        });
    }
};

module.exports = {
    createSubmission,
    getTeamSubmission,
    getCompetitionSubmissions,
    gradeSubmission
};
