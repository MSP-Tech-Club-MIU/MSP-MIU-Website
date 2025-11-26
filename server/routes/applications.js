const express = require("express");
const { createApplication, getAllApplications, updateApplicationStatus, updateApplicationComment, deleteApplication } = require("../controllers/applications");
const { authenticateToken, verifyRoleOrDepartment, verifyRole } = require("../middlewares/auth");

const router = express.Router();

// Public routes
router.post("/", createApplication);

// Protected routes (require authentication)
// Unless noted otherwise, allow: board/admin roles OR department 5 (HR)
router.get("/", authenticateToken, verifyRoleOrDepartment(['board', 'admin'], [5]), getAllApplications);
router.put("/:id/status", authenticateToken, verifyRole('board'), updateApplicationStatus); // Board only
router.put("/:id/comment", authenticateToken, verifyRoleOrDepartment(['board', 'admin'], [5]), updateApplicationComment);
router.delete("/:id", authenticateToken, verifyRoleOrDepartment(['board', 'admin'], [5]), deleteApplication);

module.exports = router;
