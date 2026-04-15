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
const {
    getAdminQuiz,
    patchAdminQuiz,
    postAdminQuizQuestion,
    putAdminQuizQuestion,
    deleteAdminQuizQuestion,
    postAdminQuizOption,
    putAdminQuizOption,
    deleteAdminQuizOption
} = require('../controllers/adminQuiz.controller');
const {
    postAdminCompetitionTask,
    putAdminCompetitionTask,
    deleteAdminCompetitionTask
} = require('../controllers/competitionTasks.controller');

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

// Quiz (admin) — tied to quiz-type competitions
router.get('/competitions/:id/quiz', getAdminQuiz);
router.patch('/competitions/:id/quiz', patchAdminQuiz);
router.post('/competitions/:id/quiz/questions', postAdminQuizQuestion);
router.put('/quiz/questions/:questionId', putAdminQuizQuestion);
router.delete('/quiz/questions/:questionId', deleteAdminQuizQuestion);
router.post('/quiz/questions/:questionId/options', postAdminQuizOption);
router.put('/quiz/options/:optionId', putAdminQuizOption);
router.delete('/quiz/options/:optionId', deleteAdminQuizOption);

// Task-quiz tasks (admin panel)
router.post('/competitions/:id/tasks', postAdminCompetitionTask);
router.put('/competition-tasks/:taskId', putAdminCompetitionTask);
router.delete('/competition-tasks/:taskId', deleteAdminCompetitionTask);

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