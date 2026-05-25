const express = require("express");
const router = express.Router();
const { registerUser, loginUser, logoutUser, getProfile, updateProfile, addScore } = require("../controllers/user");
const { authenticateToken, verifyRole } = require("../middlewares/auth");
const multer = require("multer");

// Configure multer for memory storage to handle both profile picture and schedule
const storage = multer.memoryStorage();

// File filter for profile pictures (images only)
const profilePictureFilter = (req, file, cb) => {
    if (file.fieldname === 'profile_picture') {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Profile picture must be an image file'), false);
        }
    } else {
        cb(null, true);
    }
};

// File filter for schedules (PDF only)
const scheduleFilter = (req, file, cb) => {
    if (file.fieldname === 'schedule') {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Schedule must be a PDF file'), false);
        }
    } else {
        cb(null, true);
    }
};

// Combined file filter
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'profile_picture') {
        profilePictureFilter(req, file, cb);
    } else if (file.fieldname === 'schedule') {
        scheduleFilter(req, file, cb);
    } else {
        cb(null, true);
    }
};

// Configure multer to handle multiple files
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for both files
    }
});

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", authenticateToken, logoutUser);

// Protected routes (require authentication)
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, upload.fields([
    { name: 'profile_picture', maxCount: 1 },
    { name: 'schedule', maxCount: 1 }
]), updateProfile);

// Admin-only routes
router.post("/score", authenticateToken, verifyRole('admin'), addScore);

module.exports = router;

