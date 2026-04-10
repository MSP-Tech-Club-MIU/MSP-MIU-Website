const { Competition, Event, Attendance, Application, Member, Board, User, Department, Suggestion, EventFeedback, Team, TeamMember } = require('../models');
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

        const updates = { ...req.body };
        if ('rules' in updates && (updates.rules === null || updates.rules === undefined || (typeof updates.rules === 'string' && updates.rules.trim() === ''))) {
            updates.rules = '';
        }

        const nextType = updates.type !== undefined ? updates.type : competition.type;
        if (nextType === 'quiz' || nextType === 'external') {
            updates.submission_mode = 'none';
            updates.evaluation_mode = 'none';
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
        const teams = await Team.findAll({
            where: { competition_id: id },
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['full_name', 'email', 'university_id']
                },
                {
                    model: TeamMember,
                    as: 'members',
                    attributes: ['team_member_id', 'role', 'joined_at'],
                    required: false,
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['user_id', 'full_name', 'email', 'university_id']
                    }]
                }
            ],
            order: [['created_at', 'DESC']]
        });
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
    createAdminTeam,
    updateAdminTeam,
    deleteAdminTeam
};
