const express = require("express");
const { createApplication, getAllApplications, updateApplicationStatus, updateApplicationComment, updateApplicationInterviewer, deleteApplication, checkEligibility } = require("../controllers/applications");
const { authenticateToken, verifyRoleOrDepartment, verifyRole } = require("../middlewares/auth");

const router = express.Router();

// Public routes
router.post("/check-eligibility", checkEligibility);
router.post("/", createApplication);

// Protected routes (require authentication)
// Unless noted otherwise, allow: board/admin roles OR department 5 (HR)
router.get("/", authenticateToken, verifyRoleOrDepartment(['board', 'admin'], [5]), getAllApplications);
router.put("/:id/status", authenticateToken, verifyRoleOrDepartment(['board', 'admin'], [5]), updateApplicationStatus);
router.put("/:id/interview", authenticateToken, verifyRoleOrDepartment(['board', 'admin'], [5]), updateApplicationInterviewer);
router.put("/:id/comment", authenticateToken, verifyRoleOrDepartment(['board', 'admin'], [5]), updateApplicationComment);
router.delete("/:id", authenticateToken, verifyRoleOrDepartment(['board', 'admin'], [5]), deleteApplication);

module.exports = router;
