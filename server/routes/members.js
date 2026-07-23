const express = require("express");
const router = express.Router();
const {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  exportMembersToCSV,
  sendActivationEmails,
  sendActivationEmail
} = require("../controllers/members");
const { authenticateToken, verifyRole } = require("../middlewares/auth");

router.get("/", authenticateToken, verifyRole('board', 'admin'), getAllMembers);
router.get("/export/csv", authenticateToken, verifyRole('board', 'admin'), exportMembersToCSV);
router.post("/", authenticateToken, verifyRole('admin', 'board'), createMember);
router.post(
  "/send-activation-emails",
  authenticateToken,
  verifyRole('admin', 'board'),
  sendActivationEmails
);
router.post(
  "/:id/send-activation-email",
  authenticateToken,
  verifyRole('admin', 'board'),
  sendActivationEmail
);
router.get("/:id", authenticateToken, verifyRole('board', 'admin'), getMemberById);
router.put("/:id", authenticateToken, verifyRole('admin', 'board'), updateMember);
router.delete("/:id", authenticateToken, verifyRole('admin', 'board'), deleteMember);

module.exports = router;
