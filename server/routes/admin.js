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
    deleteSuggestion,
    deleteAdminFeedback,
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
  getAdminCompetitionTasks,
  postAdminCompetitionTask,
  putAdminCompetitionTask,
  deleteAdminCompetitionTask,
  postAdminCompetitionTaskAsset,
  wrapMulterTaskAsset
} = require('../controllers/competitionTasks.controller');
const {
    getAdminCompetitionTimeslots,
    createAdminCompetitionTimeslot,
    updateAdminCompetitionTimeslot,
    deleteAdminCompetitionTimeslot,
    publishCompetitionTimeslotSelectionLinks,
    assignCompetitionTimeslotByAdmin,
    unassignCompetitionTimeslotByAdmin
} = require('../controllers/competitionTimeslots.controller');
const { searchPeople } = require('../controllers/adminPeopleSearch');

// All admin routes require authentication + admin authorization
router.use(authenticateToken);
router.use(adminAuth);

// Dashboard
router.get('/dashboard', getDashboardStats);

// People search (board + members + users) for linking board rows
router.get('/people-search', searchPeople);

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
router.get('/competitions/:id/tasks', getAdminCompetitionTasks);
router.post('/competitions/:id/tasks', postAdminCompetitionTask);
router.put('/competition-tasks/:taskId', putAdminCompetitionTask);
router.post(
    '/competition-tasks/:taskId/asset',
    wrapMulterTaskAsset,
    postAdminCompetitionTaskAsset
);
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
router.delete('/suggestions/:id', deleteSuggestion);
router.get('/feedback', getEventFeedbackAll);
router.delete('/feedback/:id', deleteAdminFeedback);

// Teams (Admin Management)
router.get('/competitions/:id/teams', getCompetitionTeams);
router.get('/competitions/:id/judges', getCompetitionJudges);
router.put('/competitions/:id/judges', updateCompetitionJudges);
router.post('/competitions/:id/teams', createAdminTeam);
router.put('/teams/:id', updateAdminTeam);
router.delete('/teams/:id', deleteAdminTeam);
router.get('/teams/:id/details', getAdminTeamDetails);
router.put('/teams/:teamId/members/:teamMemberId', updateAdminTeamMember);
router.delete('/teams/:teamId/members/:teamMemberId', removeAdminTeamMember);
router.delete('/teams/:teamId/invitations/:invitationId', cancelAdminTeamInvitation);

// Competition timeslots (project competitions only)
router.get('/competitions/:id/timeslots', getAdminCompetitionTimeslots);
router.post('/competitions/:id/timeslots', createAdminCompetitionTimeslot);
router.put('/competitions/:id/timeslots/:timeslotId', updateAdminCompetitionTimeslot);
router.delete('/competitions/:id/timeslots/:timeslotId', deleteAdminCompetitionTimeslot);
router.post('/competitions/:id/timeslots/publish-selection-links', publishCompetitionTimeslotSelectionLinks);
router.post('/competitions/:id/timeslots/:timeslotId/assign', assignCompetitionTimeslotByAdmin);
router.post('/competitions/:id/timeslots/:timeslotId/unassign', unassignCompetitionTimeslotByAdmin);

module.exports = router;