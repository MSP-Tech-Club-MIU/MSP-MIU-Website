const { Competition, Event, Attendance, Application, Member, Board, User, Department } = require('../models');
const { Op } = require('sequelize');

/**
 * Get dashboard statistics
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

        res.json({
            success: true,
            data: {
                totalMembers,
                totalCompetitions,
                totalEvents,
                pendingAttendance,
                totalApplications,
                pendingApplications
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
 */
const createCompetition = async (req, res) => {
    try {
        const {
            name,
            description,
            start_date,
            end_date,
            registration_deadline,
            max_team_size,
            min_team_size,
            max_teams,
            status,
            location
        } = req.body;

        if (!name || !description) {
            return res.status(400).json({
                success: false,
                error: 'Name and description are required'
            });
        }

        const competition = await Competition.create({
            name,
            description,
            start_date,
            end_date,
            registration_deadline,
            max_team_size: max_team_size || 4,
            min_team_size: min_team_size || 1,
            max_teams: max_teams || null,
            status: status || 'upcoming',
            location: location || null,
            created_by: req.user.user_id
        });

        res.status(201).json({
            success: true,
            data: competition
        });
    } catch (error) {
        console.error('Error creating competition:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create competition'
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

        await competition.update(req.body);

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

        await competition.destroy();

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

module.exports = {
    getDashboardStats,
    getCompetitions,
    createCompetition,
    updateCompetition,
    deleteCompetition,
    getAttendanceRequests,
    updateAttendanceStatus,
    getRegistrations,
    updateRegistrationStatus
};