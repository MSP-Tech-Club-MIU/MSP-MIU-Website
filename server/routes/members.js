const express = require("express");
const router = express.Router();
const { getAllMembers, getMemberById, deleteMember } = require("../controllers/members");
const { authenticateToken, verifyRole } = require("../middlewares/auth");

// Protected routes (require authentication - board/admin only)
// Members data should be protected as it may contain sensitive information
router.get("/", authenticateToken, verifyRole('board', 'admin'), getAllMembers);
router.get("/:id", authenticateToken, verifyRole('board', 'admin'), getMemberById);
router.delete("/:id", authenticateToken, verifyRole('admin', 'board'), deleteMember);

module.exports = router;