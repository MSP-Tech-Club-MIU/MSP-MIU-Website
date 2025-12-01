const express = require("express");
const { uploadFile, multerUpload } = require("../controllers/upload.js");
const { authenticateToken, verifyRole } = require("../middlewares/auth");
const {fileFilter} = require("../middlewares/multer.js");

const router = express.Router();
// Upload route - requires authentication and board/admin role
router.post("/:type", authenticateToken, verifyRole("admin", "board"), fileFilter, uploadFile);

module.exports = router;