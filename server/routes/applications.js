const express = require("express");
const multer = require("multer");
const path = require("path");
const { createApplication, getAllApplications, updateApplicationStatus, deleteApplication } = require("../controllers/applications");

const router = express.Router();

// Multer setup
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const filename = `StudentSchedule_${req.body.university_id}${path.extname(file.originalname)}`;
    cb(null, filename);
  }
});
const upload = multer({ storage });

// Routes
router.post("/", upload.single("schedule"), createApplication);
router.get("/", getAllApplications);
router.put("/:id/status", updateApplicationStatus);
router.delete("/:id", deleteApplication);


module.exports = router;
