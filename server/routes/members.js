const express = require("express");
const router = express.Router();
const { getAllMembers, getMemberById, updateMember, deleteMember } = require("../controllers/members");
const { authenticateToken, verifyRole } = require("../middlewares/auth");

router.get("/", authenticateToken, verifyRole('board', 'admin'), getAllMembers);
router.get("/:id", authenticateToken, verifyRole('board', 'admin'), getMemberById);
router.put("/:id", authenticateToken, verifyRole('admin', 'board'), updateMember);
router.delete("/:id", authenticateToken, verifyRole('admin', 'board'), deleteMember);

module.exports = router;
