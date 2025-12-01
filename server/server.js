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
router.use("/board", require("./routes/board"));
router.use("/members", require("./routes/members"));
router.use("/attendance", require("./routes/attendance"));
router.use("/events", require("./routes/events"));
router.use("/cloud", require("./routes/cloud"));
router.use("/upload", require("./routes/upload"));

module.exports = router;