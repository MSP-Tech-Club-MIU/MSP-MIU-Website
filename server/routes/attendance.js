const express = require("express");
const { 
    createAttendanceRequest, 
    getAllAttendanceRequests, 
    getAttendanceRequestById,
    updateAttendanceRequest,
    deleteAttendanceRequest,
    exportAttendanceRequestsToCSV
} = require("../controllers/attendance");
const { authenticateToken, verifyRoleOrDepartment } = require("../middlewares/auth");

const router = express.Router();

// Public routes
router.post("/", createAttendanceRequest);

// Protected routes (require authentication)
// Allow: admin/board roles OR department 6 (Event Planning)
router.get("/export/csv", authenticateToken, verifyRoleOrDepartment(['admin', 'board'], [6]), exportAttendanceRequestsToCSV);
router.get("/", authenticateToken, verifyRoleOrDepartment(['admin', 'board'], [6]), getAllAttendanceRequests);
router.get("/:id", authenticateToken, verifyRoleOrDepartment(['admin', 'board'], [6]), getAttendanceRequestById);
router.put("/:id", authenticateToken, verifyRoleOrDepartment(['admin', 'board'], [6]), updateAttendanceRequest);
router.delete("/:id", authenticateToken, verifyRoleOrDepartment(['admin', 'board'], [6]), deleteAttendanceRequest);

module.exports = router;

