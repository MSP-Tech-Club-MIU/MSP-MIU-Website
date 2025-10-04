const express = require("express");
const { syncModels } = require("./models");

const router = express.Router();

// Initialize database models
syncModels();

router.use("/applications", require("./routes/applications"));
router.use("/board", require("./routes/board"));
router.use("/members", require("./routes/members"));

module.exports = router;