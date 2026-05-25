const express = require("express");
const router = express.Router();
const { login, register, logout, activateAccount, verifyActivationToken, forgotPassword, resetPassword } = require("../controllers/auth");
const { authenticateToken } = require("../middlewares/auth");

// Public routes
router.post("/login", login);
router.post("/register", register);
router.post("/activate", activateAccount);
router.post("/verify-activation-token", verifyActivationToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes (require authentication)
router.post("/logout", authenticateToken, logout);

module.exports = router;

