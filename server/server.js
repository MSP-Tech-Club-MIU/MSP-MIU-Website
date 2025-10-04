const express = require("express");
const { QueryTypes } = require("sequelize");
const sequelize = require("./config/db");

const router = express.Router();

// Initialize database connection
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection has been established successfully.");
  } catch (error) {
    console.warn("⚠️  Database connection failed:", error.message);
    console.log("📝 Server will continue running without database. Create a .env file with DB credentials to enable database features.");
  }
})();

// API Routes
router.get("/board", async (req, res) => {
  try {
    const rows = await sequelize.query("SELECT * FROM board", {
      type: QueryTypes.SELECT
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;