const express = require("express");
const { 
    createAttendanceRequest, 
    getAllAttendanceRequests, 
    getAttendanceRequestById,
    updateAttendanceRequest,
    deleteAttendanceRequest
} = require("../controllers/attendance");

const router = express.Router();

// Routes
router.post("/", createAttendanceRequest);
router.get("/", getAllAttendanceRequests);
router.get("/:id", getAttendanceRequestById);
router.put("/:id", updateAttendanceRequest);
router.delete("/:id", deleteAttendanceRequest);

module.exports = router;

