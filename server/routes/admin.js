const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const { adminAuth } = require('../middlewares/adminAuth');
const {
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
} = require('../controllers/admin');

// All admin routes require authentication + admin authorization
router.use(authenticateToken);
router.use(adminAuth);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Competitions CRUD
router.get('/competitions', getCompetitions);
router.post('/competitions', createCompetition);
router.put('/competitions/:id', updateCompetition);
router.delete('/competitions/:id', deleteCompetition);

// Attendance
router.get('/attendance', getAttendanceRequests);
router.put('/attendance/:id', updateAttendanceStatus);

// Registrations
router.get('/registrations', getRegistrations);
router.put('/registrations/:id', updateRegistrationStatus);

// Notifications
router.get('/notifications', getNotifications);

// Suggestions & Feedback (admin view)
router.get('/suggestions', getSuggestions);
router.get('/feedback', getEventFeedbackAll);

// Teams (Admin Management)
router.get('/competitions/:id/teams', getCompetitionTeams);
router.post('/competitions/:id/teams', createAdminTeam);
router.put('/teams/:id', updateAdminTeam);
router.delete('/teams/:id', deleteAdminTeam);

module.exports = router;