const express = require("express");
const router = express.Router();


router.use("/applications", require("./routes/applications"));
router.use("/board", require("./routes/board"));
router.use("/members", require("./routes/members"));

module.exports = router;