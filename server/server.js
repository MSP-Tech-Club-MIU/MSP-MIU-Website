const express = require("express");
const { syncModels } = require("./models");

const router = express.Router();

// Initialize database models
syncModels();

// Auth routes (public)
router.use("/auth", require("./routes/auth"));

// User routes
router.use("/users", require("./routes/user"));

// Application routes
router.use("/applications", require("./routes/applications"));
router.use("/announcements", require("./routes/announcements"));
router.use("/board", require("./routes/board"));
router.use("/sponsors", require("./routes/sponsors"));
router.use("/departments", require("./routes/departments"));
router.use("/site-content", require("./routes/siteContent"));
router.use("/members", require("./routes/members"));
router.use("/attendance", require("./routes/attendance"));
router.use("/events", require("./routes/events"));
router.use("/competitions", require("./routes/competitions"));
router.use("/teams", require("./routes/teams"));
router.use("/submissions", require("./routes/submissions"));
router.use("/quizzes", require("./routes/quizzes"));
router.use("/quiz_attempts", require("./routes/quiz_attempts"));
router.use("/evaluation", require("./routes/evaluation.routes"));
router.use("/cloud", require("./routes/cloud"));
router.use("/upload", require("./routes/upload"));
router.use("/admin", require("./routes/admin")); // This line is for Admin Routes which are President, VP, Head of SWD

module.exports = router;