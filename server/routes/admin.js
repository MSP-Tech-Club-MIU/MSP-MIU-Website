const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const { adminAuth, adminOrProgramsAuth } = require('../middlewares/adminAuth');
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
const {
    listLogs,
    getLogsMeta,
    patchLogLevel,
    clearLogs
} = require('../controllers/adminLogs');
const {
    getBlacklistEntries,
    getBlacklistEntryById,
    createBlacklistEntry,
    updateBlacklistEntry,
    deleteBlacklistEntry
} = require('../controllers/adminBlacklist');

// All admin routes require authentication
router.use(authenticateToken);

const fullAdmin = adminAuth;
const programsAdmin = adminOrProgramsAuth;

// Dashboard + org tools — full admin only
router.get('/dashboard', fullAdmin, getDashboardStats);
router.get('/people-search', fullAdmin, searchPeople);

// Server logs viewer — President / VP / Head of SoftDev only (fullAdmin)
router.get('/logs', fullAdmin, listLogs);
router.get('/logs/meta', fullAdmin, getLogsMeta);
router.patch('/logs/level', fullAdmin, patchLogLevel);
router.delete('/logs', fullAdmin, clearLogs);

// Competitions — full admin or programs departments (SoftDev, Tech Training, AI, Cyber Security)
router.get('/competitions', programsAdmin, getCompetitions);
router.post('/competitions', programsAdmin, createCompetition);
router.put('/competitions/:id', programsAdmin, updateCompetition);
router.delete('/competitions/:id', programsAdmin, deleteCompetition);

router.get('/competitions/:id/quiz', programsAdmin, getAdminQuiz);
router.patch('/competitions/:id/quiz', programsAdmin, patchAdminQuiz);
router.post('/competitions/:id/quiz/questions', programsAdmin, postAdminQuizQuestion);
router.put('/quiz/questions/:questionId', programsAdmin, putAdminQuizQuestion);
router.delete('/quiz/questions/:questionId', programsAdmin, deleteAdminQuizQuestion);
router.post('/quiz/questions/:questionId/options', programsAdmin, postAdminQuizOption);
router.put('/quiz/options/:optionId', programsAdmin, putAdminQuizOption);
router.delete('/quiz/options/:optionId', programsAdmin, deleteAdminQuizOption);

router.get('/competitions/:id/tasks', programsAdmin, getAdminCompetitionTasks);
router.post('/competitions/:id/tasks', programsAdmin, postAdminCompetitionTask);
router.put('/competition-tasks/:taskId', programsAdmin, putAdminCompetitionTask);
router.post(
    '/competition-tasks/:taskId/asset',
    programsAdmin,
    wrapMulterTaskAsset,
    postAdminCompetitionTaskAsset
);
router.delete('/competition-tasks/:taskId', programsAdmin, deleteAdminCompetitionTask);

router.get('/competitions/:id/teams', programsAdmin, getCompetitionTeams);
router.get('/competitions/:id/judges', programsAdmin, getCompetitionJudges);
router.put('/competitions/:id/judges', programsAdmin, updateCompetitionJudges);
router.post('/competitions/:id/teams', programsAdmin, createAdminTeam);
router.put('/teams/:id', programsAdmin, updateAdminTeam);
router.delete('/teams/:id', programsAdmin, deleteAdminTeam);
router.get('/teams/:id/details', programsAdmin, getAdminTeamDetails);
router.put('/teams/:teamId/members/:teamMemberId', programsAdmin, updateAdminTeamMember);
router.delete('/teams/:teamId/members/:teamMemberId', programsAdmin, removeAdminTeamMember);
router.delete('/teams/:teamId/invitations/:invitationId', programsAdmin, cancelAdminTeamInvitation);

router.get('/competitions/:id/timeslots', programsAdmin, getAdminCompetitionTimeslots);
router.post('/competitions/:id/timeslots', programsAdmin, createAdminCompetitionTimeslot);
router.put('/competitions/:id/timeslots/:timeslotId', programsAdmin, updateAdminCompetitionTimeslot);
router.delete('/competitions/:id/timeslots/:timeslotId', programsAdmin, deleteAdminCompetitionTimeslot);
router.post('/competitions/:id/timeslots/publish-selection-links', programsAdmin, publishCompetitionTimeslotSelectionLinks);
router.post('/competitions/:id/timeslots/:timeslotId/assign', programsAdmin, assignCompetitionTimeslotByAdmin);
router.post('/competitions/:id/timeslots/:timeslotId/unassign', programsAdmin, unassignCompetitionTimeslotByAdmin);

// Attendance (nested under Events) — programs departments included
router.get('/attendance', programsAdmin, getAttendanceRequests);
router.put('/attendance/:id', programsAdmin, updateAttendanceStatus);

// Registrations (legacy admin path) — full admin only; Programs uses /api/applications
router.get('/registrations', fullAdmin, getRegistrations);
router.put('/registrations/:id', fullAdmin, updateRegistrationStatus);

// Communications — full admin only
router.get('/notifications', fullAdmin, getNotifications);
router.get('/suggestions', fullAdmin, getSuggestions);
router.delete('/suggestions/:id', fullAdmin, deleteSuggestion);
router.get('/feedback', fullAdmin, getEventFeedbackAll);
router.delete('/feedback/:id', fullAdmin, deleteAdminFeedback);

// Blacklist management — full admin only
router.get('/blacklist', fullAdmin, getBlacklistEntries);
router.post('/blacklist', fullAdmin, createBlacklistEntry);
router.get('/blacklist/:id', fullAdmin, getBlacklistEntryById);
router.put('/blacklist/:id', fullAdmin, updateBlacklistEntry);
router.delete('/blacklist/:id', fullAdmin, deleteBlacklistEntry);

module.exports = router;
