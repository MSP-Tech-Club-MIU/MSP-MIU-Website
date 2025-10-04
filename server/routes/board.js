const express = require("express");
const router = express.Router();
const { getBoard } = require("../controllers/board");

router.get("/", getBoard);


module.exports = router;