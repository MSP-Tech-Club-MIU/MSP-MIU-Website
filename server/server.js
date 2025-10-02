require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { QueryTypes } = require("sequelize");
const PORT = process.env.PORT;

const app = express();
app.use(cors());
app.use(bodyParser.json());

const sequelize = require("./config/db");

app.get("/api/board", async (req, res) => {
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


async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();

module.exports = app;