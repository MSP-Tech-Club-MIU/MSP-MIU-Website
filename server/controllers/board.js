const { QueryTypes } = require("sequelize");
const sequelize = require("../config/db");

const getBoard = async (req, res) => {
  try {
    const rows = await sequelize.query("SELECT * FROM board", {
      type: QueryTypes.SELECT
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
}

module.exports = {
    getBoard
}