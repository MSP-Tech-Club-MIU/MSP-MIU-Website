const { Sequelize } = require("sequelize");
const logger = require("../utils/logger");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    dialect: "mysql",
    logging: (msg) => logger.debug(msg, { module: "sequelize" }),
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      },
      // Avoid BIGINT → JS BigInt from mysql2, which breaks JSON.stringify / res.json()
      supportBigNumbers: true,
      bigNumberStrings: true
    }
  }
);

(async () => {
  try {
    await sequelize.authenticate();
    logger.info("Database connection has been established successfully.", {
      module: "db"
    });
  } catch (error) {
    logger.warn("Database connection failed", {
      module: "db",
      message: error.message
    });
    logger.info(
      "Server will continue running without database. Create a .env file with DB credentials to enable database features.",
      { module: "db" }
    );
  }
})();

module.exports = sequelize;
