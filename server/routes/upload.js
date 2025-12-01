const express = require("express");

const { authenticateToken, verifyRole } = require("../middlewares/auth");
const {uploadFile, upload} = require("../middlewares/multer.js");

const router = express.Router();
// Upload route - requires authentication and board/admin role
router.post("/:type", authenticateToken, verifyRole("admin", "board"), upload.single("file") ,uploadFile );

module.exports = router;