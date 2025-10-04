const express = require("express");
const router = express.Router();
const { getAllMembers, getMemberById, deleteMember } = require("../controllers/members");

router.get("/", getAllMembers);
router.get("/:id", getMemberById);
router.delete("/:id", deleteMember);


module.exports = router;