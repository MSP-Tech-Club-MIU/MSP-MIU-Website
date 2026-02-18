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
    updateRegistrationStatus
} = require('../controllers/admin'); // To get functions that admin does from Competition add, delete, update, get, attendance add,
// delete, update, get, registrations add, delete, update, get

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

module.exports = router;