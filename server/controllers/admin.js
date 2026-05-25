const { QueryTypes } = require('sequelize');
const { Competition, Event, Attendance, Application, Member, Board, User, Department, Suggestion, EventFeedback, Team, sequelize } = require('../models');
const { ensureQuizForCompetition } = require('../utils/ensureQuizForCompetition');
const AdminNotification = require('../models/AdminNotification');
const { Op } = require('sequelize');

/**
 * Helper: Log an admin notification
 */
const logAdminAction = async (actionType, message, req, entityType = null, entityId = null) => {
    try {
        const boardMember = req.boardMember;
        await AdminNotification.create({
            action_type: actionType,
            message,
            performed_by: req.user.user_id,
            performer_name: boardMember?.full_name || 'Admin',
            performer_position: boardMember?.position || 'Admin',
            entity_type: entityType,
            entity_id: entityId
        });
    } catch (err) {
        console.error('Failed to log admin notification:', err);
    }
};

function parseCompetitionConfig(configValue) {
    if (!configValue) return null;
    if (typeof configValue === 'object') return configValue;
    try {
        return JSON.parse(configValue);
    } catch (_) {
        return null;
    }
}

function writeCompetitionConfig(configObj) {
    if (configObj == null) return null;
    return JSON.stringify(configObj);
}

/**
 * Get dashboard statistics + current admin info
 */
const getDashboardStats = async (req, res) => {
    try {
        const [
            totalMembers,
            totalCompetitions,
            totalEvents,
            pendingAttendance,
            totalApplications,
            pendingApplications
        ] = await Promise.all([
            Member.count(),
            Competition.count(),
            Event.count(),
            Attendance.count({ where: { attended: false } }),
            Application.count(),
            Application.count({ where: { status: 'pending' } })
        ]);

        // Get the logged-in admin's board info
        const boardMember = req.boardMember;
        let adminInfo = null;
        if (boardMember) {
            // Determine admin title
            let adminTitle = boardMember.position;
            if (boardMember.position === 'Head' && boardMember.department_id === 1) {
                adminTitle = 'Head of Software Development';
            }
            adminInfo = {
                full_name: boardMember.full_name,
                position: boardMember.position,
                title: adminTitle,
                department_id: boardMember.department_id
            };
        }

        res.json({
            success: true,
            data: {
                totalMembers,
                totalCompetitions,
                totalEvents,
                pendingAttendance,
                totalApplications,
                pendingApplications,
                adminInfo
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard statistics'
        });
    }
};

/**
 * Get all competitions
 */
const getCompetitions = async (req, res) => {
    try {
        const competitions = await Competition.findAll({
            order: [['created_at', 'DESC']]
        });

        res.json({
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
 * Create a competition
 * Maps frontend form fields to the actual Competition model fields
 */
const createCompetition = async (req, res) => {
    try {
        const {
            title,
            description,
            start_at,
            end_at,
            max_team_size,
            min_team_size,
            status,
            location_type,
            location_details,
            rules,
            type,
            submission_mode,
            evaluation_mode,
            is_team_based,
            config
        } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                success: false,
                error: 'Title and description are required'
            });
        }

        if (!start_at || !end_at) {
            return res.status(400).json({
                success: false,
                error: 'Start date and end date are required'
            });
        }

        const resolvedType = type || 'project';
        let resolvedSubmission = submission_mode ?? 'upload';
        let resolvedEvaluation = evaluation_mode ?? 'manual';
        if (resolvedType === 'quiz' || resolvedType === 'external') {
            resolvedSubmission = 'none';
            resolvedEvaluation = 'none';
        }

        const effectiveIsTeamBased = is_team_based !== undefined ? Boolean(is_team_based) : true;
        let minSize = min_team_size || 1;
        let maxSize = max_team_size || 4;
        if (!effectiveIsTeamBased) {
            minSize = 1;
            maxSize = 1;
        }

        const competition = await Competition.create({
            title,
            description,
            start_at,
            end_at,
            max_team_size: maxSize,
            min_team_size: minSize,
            status: status || 'draft',
            location_type: location_type || 'on-campus',
            location_details: location_details || null,
            rules: (rules != null && String(rules).trim() !== '') ? String(rules).trim() : '',
            type: resolvedType,
            submission_mode: resolvedSubmission,
            evaluation_mode: resolvedEvaluation,
            is_team_based: effectiveIsTeamBased,
            config: config ?? null,
            created_by: req.user.user_id
        });

        await ensureQuizForCompetition(competition.get({ plain: true }), req.user.user_id);

        // Log notification
        await logAdminAction(
            'competition_created',
            `Created competition "${title}"`,
            req,
            'competition',
            competition.competition_id
        );

        res.status(201).json({
            success: true,
            data: competition
        });
    } catch (error) {
        console.error('Error creating competition:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create competition'
        });
    }
};

/**
 * Update a competition
 */
const updateCompetition = async (req, res) => {
    try {
        const { id } = req.params;
        const competition = await Competition.findByPk(id);

        if (!competition) {
            return res.status(404).json({
                success: false,
                error: 'Competition not found'
            });
        }

        const {
            title,
            description,
            start_at,
            end_at,
            max_team_size,
            min_team_size,
            status,
            location_type,
            location_details,
            rules,
            type,
            submission_mode,
            evaluation_mode,
            is_team_based,
            config
        } = req.body;

        const updates = {};

        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (start_at !== undefined) updates.start_at = start_at;
        if (end_at !== undefined) updates.end_at = end_at;
        if (status !== undefined) updates.status = status;
        if (location_type !== undefined) updates.location_type = location_type;
        if (location_details !== undefined) updates.location_details = location_details;
        if (rules !== undefined) {
            updates.rules =
                rules != null && String(rules).trim() !== '' ? String(rules).trim() : '';
        }
        if (type !== undefined) updates.type = type;
        if (config !== undefined) updates.config = config ?? null;

        const nextType = updates.type !== undefined ? updates.type : competition.type;
        if (nextType === 'quiz' || nextType === 'external') {
            updates.submission_mode = 'none';
            updates.evaluation_mode = 'none';
        } else {
            if (submission_mode !== undefined) updates.submission_mode = submission_mode;
            if (evaluation_mode !== undefined) updates.evaluation_mode = evaluation_mode;
        }

        const effectiveIsTeamBased =
            is_team_based !== undefined ? Boolean(is_team_based) : Boolean(competition.is_team_based);
        if (is_team_based !== undefined) {
            updates.is_team_based = effectiveIsTeamBased;
        }

        if (!effectiveIsTeamBased) {
            updates.min_team_size = 1;
            updates.max_team_size = 1;
        } else {
            if (min_team_size !== undefined) updates.min_team_size = min_team_size;
            if (max_team_size !== undefined) updates.max_team_size = max_team_size;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No fields to update'
            });
        }

        await competition.update(updates);
        await competition.reload();
        await ensureQuizForCompetition(competition.get({ plain: true }), req.user.user_id);

        // Log notification
        await logAdminAction(
            'competition_updated',
            `Updated competition "${competition.title}"`,
            req,
            'competition',
            competition.competition_id
        );

        res.json({
            success: true,
            data: competition
        });
    } catch (error) {
        console.error('Error updating competition:', error);
        if (error?.name === 'SequelizeValidationError' || error?.name === 'SequelizeDatabaseError') {
            return res.status(400).json({
                success: false,
                error: error.message || 'Invalid competition update payload'
            });
        }
        res.status(500).json({
            success: false,
            error: 'Failed to update competition'
        });
    }
};

/**
 * Delete a competition
 */
const deleteCompetition = async (req, res) => {
    try {
        const { id } = req.params;
        const competition = await Competition.findByPk(id);

        if (!competition) {
            return res.status(404).json({
                success: false,
                error: 'Competition not found'
            });
        }

        const title = competition.title;
        await competition.destroy();

        // Log notification
        await logAdminAction(
            'competition_deleted',
            `Deleted competition "${title}"`,
            req,
            'competition',
            parseInt(id)
        );

        res.json({
            success: true,
            message: 'Competition deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting competition:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete competition'
        });
    }
};

/**
 * Get judge assignment candidates and selected board judges for a competition.
 */
const getCompetitionJudges = async (req, res) => {
    try {
        const { id } = req.params;
        const competition = await Competition.findByPk(id, {
            attributes: ['competition_id', 'title', 'type', 'evaluation_mode', 'config']
        });
        if (!competition) {
            return res.status(404).json({ success: false, error: 'Competition not found' });
        }

        const boardRows = await Board.findAll({
            where: { user_id: { [Op.ne]: null } },
            attributes: ['board_id', 'user_id', 'full_name', 'position', 'department_id', 'email'],
            order: [['position', 'ASC'], ['full_name', 'ASC']]
        });

        const config = parseCompetitionConfig(competition.config) || {};
        const assigned = Array.isArray(config?.judging?.assigned_board_user_ids)
            ? config.judging.assigned_board_user_ids.map((x) => Number(x)).filter((x) => Number.isFinite(x))
            : [];

        return res.json({
            success: true,
            data: {
                competition: {
                    competition_id: competition.competition_id,
                    title: competition.title,
                    type: competition.type,
                    evaluation_mode: competition.evaluation_mode
                },
                assigned_board_user_ids: assigned,
                board_candidates: boardRows.map((row) => ({
                    board_id: row.board_id,
                    user_id: row.user_id,
                    full_name: row.full_name,
                    position: row.position,
                    department_id: row.department_id,
                    email: row.email
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching competition judges:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch competition judges' });
    }
};

/**
 * Assign board members who can judge this competition.
 */
const updateCompetitionJudges = async (req, res) => {
    try {
        const { id } = req.params;
        const { assigned_board_user_ids } = req.body || {};

        const competition = await Competition.findByPk(id, {
            attributes: ['competition_id', 'title', 'type', 'evaluation_mode', 'config']
        });
        if (!competition) {
            return res.status(404).json({ success: false, error: 'Competition not found' });
        }

        if (!['project', 'task_quiz'].includes(competition.type)) {
            return res.status(400).json({
                success: false,
                error: 'Judge assignment is only available for project and task_quiz competitions'
            });
        }
        if (!['manual', 'hybrid'].includes(competition.evaluation_mode)) {
            return res.status(400).json({
                success: false,
                error: 'Judge assignment is available only for manual and hybrid evaluation modes'
            });
        }

        if (!Array.isArray(assigned_board_user_ids)) {
            return res.status(400).json({
                success: false,
                error: 'assigned_board_user_ids must be an array of user ids'
            });
        }

        const normalizedIds = [...new Set(
            assigned_board_user_ids.map((x) => Number(x)).filter((x) => Number.isFinite(x))
        )];

        if (normalizedIds.length > 0) {
            const boardMatches = await Board.findAll({
                where: {
                    user_id: { [Op.in]: normalizedIds }
                },
                attributes: ['user_id']
            });
            const validBoardUserIds = new Set(boardMatches.map((x) => Number(x.user_id)));
            const invalid = normalizedIds.filter((x) => !validBoardUserIds.has(x));
            if (invalid.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Some users are not board members: ${invalid.join(', ')}`
                });
            }
        }

        const config = parseCompetitionConfig(competition.config) || {};
        config.judging = config.judging || {};
        config.judging.assigned_board_user_ids = normalizedIds;
        await competition.update({ config: writeCompetitionConfig(config) });
        await competition.reload();

        await logAdminAction(
            'competition_judges_updated',
            `Updated judge assignments for "${competition.title}"`,
            req,
            'competition',
            competition.competition_id
        );

        return res.json({
            success: true,
            data: {
                competition_id: competition.competition_id,
                assigned_board_user_ids: normalizedIds
            }
        });
    } catch (error) {
        console.error('Error updating competition judges:', error);
        return res.status(500).json({ success: false, error: 'Failed to update competition judges' });
    }
};

/**
 * Get all attendance requests
 */
const getAttendanceRequests = async (req, res) => {
    try {
        const { event_id, attended, date } = req.query;
        const where = {};

        if (event_id) where.event_id = event_id;
        if (attended !== undefined) where.attended = attended === 'true';
        if (date) {
            where.created_at = {
                [Op.gte]: new Date(date),
                [Op.lt]: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
            };
        }

        const requests = await Attendance.findAll({
            where,
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: requests
        });
    } catch (error) {
        console.error('Error fetching attendance requests:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch attendance requests'
        });
    }
};

/**
 * Update attendance status
 */
const updateAttendanceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { attended } = req.body;

        const request = await Attendance.findByPk(id);

        if (!request) {
            return res.status(404).json({
                success: false,
                error: 'Attendance request not found'
            });
        }

        await request.update({ attended });

        // Log notification
        await logAdminAction(
            'attendance_updated',
            `${attended ? 'Confirmed' : 'Revoked'} attendance for ${request.full_name || 'a member'}`,
            req,
            'attendance',
            request.attendance_id
        );

        res.json({
            success: true,
            data: request
        });
    } catch (error) {
        console.error('Error updating attendance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update attendance status'
        });
    }
};

/**
 * Get all registrations/applications
 */
const getRegistrations = async (req, res) => {
    try {
        const { status, search } = req.query;
        const where = {};

        if (status) where.status = status;
        if (search) {
            where[Op.or] = [
                { full_name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { university_id: { [Op.like]: `%${search}%` } }
            ];
        }

        const applications = await Application.findAll({
            where,
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: applications
        });
    } catch (error) {
        console.error('Error fetching registrations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch registrations'
        });
    }
};

/**
 * Update registration status
 */
const updateRegistrationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const application = await Application.findByPk(id);

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        await application.update({ status });

        // Log notification
        await logAdminAction(
            `registration_${status}`,
            `${status.charAt(0).toUpperCase() + status.slice(1)} application from ${application.full_name || 'applicant'}`,
            req,
            'registration',
            application.application_id
        );

        res.json({
            success: true,
            data: application
        });
    } catch (error) {
        console.error('Error updating registration:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update registration status'
        });
    }
};

/**
 * Get admin notifications
 */
const getNotifications = async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const notifications = await AdminNotification.findAll({
            order: [['created_at', 'DESC']],
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            data: notifications
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notifications'
        });
    }
};

/**
 * Get all suggestions (admin)
 */
const getSuggestions = async (req, res) => {
    try {
        const suggestions = await Suggestion.findAll({
            include: [{ model: Member, as: 'member', attributes: ['member_id', 'full_name', 'email', 'university_id'] }],
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, data: suggestions });
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to fetch suggestions' });
    }
};

/**
 * Get all event feedback (admin)
 */
const getEventFeedbackAll = async (req, res) => {
    try {
        const feedbacks = await EventFeedback.findAll({
            include: [{ model: Event, as: 'event', attributes: ['event_id', 'name', 'event_date'] }],
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, data: feedbacks });
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to fetch feedback' });
    }
};

// ============================================
// Teams CRUD (Admin)
// ============================================

/**
 * Get teams for a specific competition
 */
const getCompetitionTeams = async (req, res) => {
    try {
        const { id } = req.params;
        const rows = await sequelize.query(
            `SELECT t.team_id,
                    t.competition_id,
                    t.team_name,
                    t.is_locked,
                    t.created_at,
                    t.created_by_user_id,
                    u.full_name AS creator_full_name,
                    u.email AS creator_email,
                    (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id) AS member_count,
                    (SELECT COUNT(*) FROM team_invitations ti
                     WHERE ti.team_id = t.team_id AND ti.status = 'pending') AS pending_invitations_count,
                    (SELECT ti2.invited_name FROM team_invitations ti2
                     WHERE ti2.team_id = t.team_id ORDER BY ti2.invitation_id ASC LIMIT 1) AS guest_contact_name
             FROM teams t
             LEFT JOIN users u ON t.created_by_user_id = u.user_id
             WHERE t.competition_id = ?
             ORDER BY t.created_at DESC`,
            {
                replacements: [id],
                type: QueryTypes.SELECT
            }
        );

        const teamIds = rows.map((row) => row.team_id).filter(Boolean);
        let teamMembersRows = [];
        if (teamIds.length > 0) {
            teamMembersRows = await sequelize.query(
                `SELECT tm.team_id,
                        tm.team_member_id,
                        tm.role,
                        tm.joined_at,
                        u.user_id,
                        u.full_name,
                        u.email,
                        u.university_id
                 FROM team_members tm
                 INNER JOIN users u ON tm.user_id = u.user_id
                 WHERE tm.team_id IN (?)
                 ORDER BY tm.team_id ASC, tm.role DESC, tm.joined_at ASC`,
                {
                    replacements: [teamIds],
                    type: QueryTypes.SELECT
                }
            );
        }

        const teamMembersByTeamId = teamMembersRows.reduce((acc, memberRow) => {
            if (!acc[memberRow.team_id]) acc[memberRow.team_id] = [];
            acc[memberRow.team_id].push({
                team_member_id: memberRow.team_member_id,
                role: memberRow.role,
                joined_at: memberRow.joined_at,
                user_id: memberRow.user_id,
                full_name: memberRow.full_name,
                email: memberRow.email,
                university_id: memberRow.university_id
            });
            return acc;
        }, {});

        const teams = rows.map((row) => ({
            team_id: row.team_id,
            competition_id: row.competition_id,
            team_name: row.team_name,
            is_locked: row.is_locked,
            created_at: row.created_at,
            created_by_user_id: row.created_by_user_id,
            member_count: Number(row.member_count) || 0,
            pending_invitations_count: Number(row.pending_invitations_count) || 0,
            creator: row.creator_full_name
                ? { full_name: row.creator_full_name, email: row.creator_email }
                : row.guest_contact_name
                    ? {
                        full_name: `${row.guest_contact_name} (pending signup)`,
                        email: null
                    }
                    : null,
            members: teamMembersByTeamId[row.team_id] || []
        }));

        res.json({ success: true, data: teams });
    } catch (error) {
        console.error('Error fetching teams:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch teams' });
    }
};

/**
 * Admin create team directly
 */
const createAdminTeam = async (req, res) => {
    try {
        const { id } = req.params; // competition_id
        const { team_name, is_locked } = req.body;

        const competition = await Competition.findByPk(id);
        if (!competition) {
            return res.status(404).json({ success: false, error: 'Competition not found' });
        }

        // Check if team name exists in this competition
        const existingTeam = await Team.findOne({
            where: { competition_id: id, team_name }
        });

        if (existingTeam) {
            return res.status(400).json({ success: false, error: 'Team name already exists in this competition' });
        }

        const team = await Team.create({
            competition_id: id,
            team_name,
            is_locked: is_locked || false,
            created_by_user_id: req.user.user_id // The admin creating it
        });

        await logAdminAction(
            'team_created',
            `Created team "${team_name}" in ${competition.title}`,
            req,
            'team',
            team.team_id
        );

        res.status(201).json({ success: true, data: team });
    } catch (error) {
        console.error('Error creating team:', error);
        res.status(500).json({ success: false, error: 'Failed to create team' });
    }
};

/**
 * Admin update team
 */
const updateAdminTeam = async (req, res) => {
    try {
        const { id } = req.params; // team_id
        const { team_name, is_locked } = req.body;

        const team = await Team.findByPk(id);
        if (!team) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }

        await team.update({
            team_name: team_name || team.team_name,
            is_locked: is_locked !== undefined ? is_locked : team.is_locked
        });

        await logAdminAction(
            'team_updated',
            `Updated team "${team.team_name}"`,
            req,
            'team',
            team.team_id
        );

        res.json({ success: true, data: team });
    } catch (error) {
        console.error('Error updating team:', error);
        res.status(500).json({ success: false, error: 'Failed to update team' });
    }
};

/**
 * Admin delete team
 */
const deleteAdminTeam = async (req, res) => {
    try {
        const { id } = req.params; // team_id

        const team = await Team.findByPk(id);
        if (!team) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }

        const teamName = team.team_name;
        await team.destroy();

        await logAdminAction(
            'team_deleted',
            `Deleted team "${teamName}"`,
            req,
            'team',
            id
        );

        res.json({ success: true, message: 'Team deleted successfully' });
    } catch (error) {
        console.error('Error deleting team:', error);
        res.status(500).json({ success: false, error: 'Failed to delete team' });
    }
};

/**
 * Admin get full team details (accepted + pending)
 */
const getAdminTeamDetails = async (req, res) => {
    try {
        const { id } = req.params; // team_id
        const teamRows = await sequelize.query(
            `SELECT t.team_id, t.competition_id, t.team_name, t.is_locked, t.created_at
             FROM teams t
             WHERE t.team_id = ?
             LIMIT 1`,
            {
                replacements: [id],
                type: QueryTypes.SELECT
            }
        );

        if (!teamRows || teamRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }

        const members = await sequelize.query(
            `SELECT tm.team_member_id,
                    tm.team_id,
                    tm.user_id,
                    tm.role,
                    tm.joined_at,
                    u.full_name,
                    u.email,
                    u.university_id
             FROM team_members tm
             INNER JOIN users u ON tm.user_id = u.user_id
             WHERE tm.team_id = ?
             ORDER BY tm.role DESC, tm.joined_at ASC`,
            {
                replacements: [id],
                type: QueryTypes.SELECT
            }
        );

        const pendingInvitations = await sequelize.query(
            `SELECT ti.invitation_id,
                    ti.team_id,
                    ti.invited_email,
                    ti.invited_name,
                    ti.invited_university_id,
                    ti.status,
                    ti.expires_at,
                    ti.invited_at AS created_at
             FROM team_invitations ti
             WHERE ti.team_id = ? AND ti.status = 'pending'
             ORDER BY ti.invited_at ASC`,
            {
                replacements: [id],
                type: QueryTypes.SELECT
            }
        );

        res.json({
            success: true,
            data: {
                ...teamRows[0],
                members,
                pending_invitations: pendingInvitations
            }
        });
    } catch (error) {
        console.error('Error fetching admin team details:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch team details' });
    }
};

/**
 * Admin remove a member from team
 */
const removeAdminTeamMember = async (req, res) => {
    try {
        const { teamId, teamMemberId } = req.params;
        const rows = await sequelize.query(
            `SELECT tm.team_member_id, tm.team_id, tm.user_id, tm.role, t.team_name, u.full_name
             FROM team_members tm
             INNER JOIN teams t ON t.team_id = tm.team_id
             LEFT JOIN users u ON u.user_id = tm.user_id
             WHERE tm.team_member_id = ? AND tm.team_id = ?
             LIMIT 1`,
            {
                replacements: [teamMemberId, teamId],
                type: QueryTypes.SELECT
            }
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Team member not found' });
        }

        const member = rows[0];
        await sequelize.query(
            `DELETE FROM team_members WHERE team_member_id = ?`,
            {
                replacements: [teamMemberId],
                type: QueryTypes.DELETE
            }
        );

        await logAdminAction(
            'team_member_removed',
            `Removed ${member.full_name || `user ${member.user_id}`} from team "${member.team_name}"`,
            req,
            'team',
            teamId
        );

        res.json({ success: true, message: 'Team member removed' });
    } catch (error) {
        console.error('Error removing team member (admin):', error);
        res.status(500).json({ success: false, error: 'Failed to remove team member' });
    }
};

/**
 * Admin update team member profile info
 */
const updateAdminTeamMember = async (req, res) => {
    try {
        const { teamId, teamMemberId } = req.params;
        const { full_name, email, university_id } = req.body || {};

        const rows = await sequelize.query(
            `SELECT tm.team_member_id, tm.team_id, tm.user_id, t.team_name
             FROM team_members tm
             INNER JOIN teams t ON t.team_id = tm.team_id
             WHERE tm.team_member_id = ? AND tm.team_id = ?
             LIMIT 1`,
            {
                replacements: [teamMemberId, teamId],
                type: QueryTypes.SELECT
            }
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Team member not found' });
        }

        const member = rows[0];
        const updatePayload = {};

        if (typeof full_name === 'string' && full_name.trim()) {
            updatePayload.full_name = full_name.trim();
        }

        if (typeof email === 'string' && email.trim()) {
            updatePayload.email = email.trim().toLowerCase();
        }

        if (typeof university_id === 'string') {
            updatePayload.university_id = university_id.trim() || null;
        }

        if (Object.keys(updatePayload).length === 0) {
            return res.status(400).json({ success: false, error: 'No valid member fields to update' });
        }

        const [affectedCount] = await User.update(updatePayload, {
            where: { user_id: member.user_id }
        });

        if (!affectedCount) {
            return res.status(404).json({ success: false, error: 'User record not found' });
        }

        const user = await User.findByPk(member.user_id, {
            attributes: ['user_id', 'full_name', 'email', 'university_id']
        });

        await logAdminAction(
            'team_member_updated',
            `Updated member info in team "${member.team_name}"`,
            req,
            'team',
            teamId
        );

        res.json({
            success: true,
            data: {
                team_member_id: Number(teamMemberId),
                team_id: Number(teamId),
                ...user?.toJSON?.()
            }
        });
    } catch (error) {
        console.error('Error updating team member (admin):', error);
        if (error?.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                error: 'Email or university ID already exists for another account'
            });
        }
        res.status(500).json({ success: false, error: 'Failed to update team member' });
    }
};

/**
 * Admin cancel a pending invitation
 */
const cancelAdminTeamInvitation = async (req, res) => {
    try {
        const { teamId, invitationId } = req.params;
        const rows = await sequelize.query(
            `SELECT ti.invitation_id, ti.team_id, ti.invited_email, t.team_name
             FROM team_invitations ti
             INNER JOIN teams t ON t.team_id = ti.team_id
             WHERE ti.invitation_id = ? AND ti.team_id = ?
             LIMIT 1`,
            {
                replacements: [invitationId, teamId],
                type: QueryTypes.SELECT
            }
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Invitation not found' });
        }

        await sequelize.query(
            `DELETE FROM team_invitations WHERE invitation_id = ? AND status = 'pending'`,
            {
                replacements: [invitationId],
                type: QueryTypes.DELETE
            }
        );

        await logAdminAction(
            'team_invitation_cancelled',
            `Cancelled pending invitation (${rows[0].invited_email}) for team "${rows[0].team_name}"`,
            req,
            'team',
            teamId
        );

        res.json({ success: true, message: 'Invitation cancelled' });
    } catch (error) {
        console.error('Error cancelling invitation (admin):', error);
        res.status(500).json({ success: false, error: 'Failed to cancel invitation' });
    }
};

module.exports = {
    getDashboardStats,
    getCompetitions,
    createCompetition,
    updateCompetition,
    deleteCompetition,
    getAttendanceRequests,
    updateAttendanceStatus,
    getRegistrations,
    updateRegistrationStatus,
    getNotifications,
    getSuggestions,
    getEventFeedbackAll,
    getCompetitionTeams,
    getCompetitionJudges,
    createAdminTeam,
    updateAdminTeam,
    deleteAdminTeam,
    getAdminTeamDetails,
    updateAdminTeamMember,
    removeAdminTeamMember,
    cancelAdminTeamInvitation,
    updateCompetitionJudges
};
