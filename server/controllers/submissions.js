const db = require('../config/db');
const { uploadToR2 } = require('../config/cloud');
const path = require('path');

/**
 * Submit team work (ZIP file and/or links)
 * POST /api/submissions
 * Authenticated route (team members only)
 */
const createSubmission = async (req, res) => {
    try {
        const { competition_id, team_id, submit_type, repo_url, live_url, notes } = req.body;
        const userId = req.user.user_id;

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
            `SELECT tm.team_member_id, t.is_locked
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

        // Check competition status
        const competitions = await db.query(
            `SELECT status, end_at FROM competitions WHERE competition_id = ?`,
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
        if (new Date() > new Date(competition.end_at)) {
            return res.status(400).json({
                success: false,
                error: 'Submission deadline has passed'
            });
        }

        // Validate submit_type requirements
        if ((submit_type === 'links' || submit_type === 'zip_and_links') && (!repo_url && !live_url)) {
            return res.status(400).json({
                success: false,
                error: 'At least one link (repo_url or live_url) is required'
            });
        }

        // Handle file upload if provided
        let r2Key = null;
        if (req.file && (submit_type === 'zip' || submit_type === 'zip_and_links')) {
            try {
                // Upload to R2: competitions/{competition_id}/teams/{team_id}/submission.zip
                const fileName = `competitions/${competition_id}/teams/${team_id}/submission_${Date.now()}${path.extname(req.file.originalname)}`;
                const uploadResult = await uploadToR2(req.file.buffer, fileName, req.file.mimetype);
                r2Key = uploadResult.key;
            } catch (uploadError) {
                console.error('Error uploading file to R2:', uploadError);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to upload file'
                });
            }
        }

        if ((submit_type === 'zip' || submit_type === 'zip_and_links') && !r2Key) {
            return res.status(400).json({
                success: false,
                error: 'ZIP file is required for this submission type'
            });
        }

        // Check if submission already exists
        const existingSubmissions = await db.query(
            `SELECT submission_id FROM submissions 
             WHERE competition_id = ? AND team_id = ?`,
            {
                replacements: [competition_id, team_id],
                type: db.QueryTypes.SELECT
            }
        );

        if (existingSubmissions && existingSubmissions.length > 0) {
            // Update existing submission
            await db.query(
                `UPDATE submissions 
                 SET submit_type = ?, r2_key = ?, repo_url = ?, live_url = ?, notes = ?, 
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

            return res.status(200).json({
                success: true,
                message: 'Submission updated successfully',
                data: updatedSubmissions[0]
            });
        }

        // Create new submission
        const result = await db.query(
            `INSERT INTO submissions 
             (competition_id, team_id, submit_type, r2_key, repo_url, live_url, notes, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted')`,
            {
                replacements: [
                    competition_id,
                    team_id,
                    submit_type,
                    r2Key,
                    repo_url || null,
                    live_url || null,
                    notes || null
                ],
                type: db.QueryTypes.INSERT
            }
        );

        const newSubmissions = await db.query(
            `SELECT * FROM submissions WHERE submission_id = ?`,
            {
                replacements: [result],
                type: db.QueryTypes.SELECT
            }
        );

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

/**
 * Get team's submission for a competition
 * GET /api/competitions/:competitionId/teams/:teamId/submission
 * Authenticated route
 */
const getTeamSubmission = async (req, res) => {
    try {
        const { competitionId, teamId } = req.params;

        const submissions = await db.query(
            `SELECT s.*, t.team_name
             FROM submissions s
             INNER JOIN teams t ON s.team_id = t.team_id
             WHERE s.competition_id = ? AND s.team_id = ?`,
            {
                replacements: [competitionId, teamId],
                type: db.QueryTypes.SELECT
            }
        );

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

        if (score === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Score is required'
            });
        }

        if (score < 0 || score > 100) {
            return res.status(400).json({
                success: false,
                error: 'Score must be between 0 and 100'
            });
        }

        await db.query(
            `UPDATE submissions 
             SET score = ?, feedback = ?, status = 'judged'
             WHERE submission_id = ?`,
            {
                replacements: [score, feedback || null, id],
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
