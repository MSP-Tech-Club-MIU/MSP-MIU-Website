/**
 * Targeted schema patch for announcement approval workflow.
 * Safe to re-run.
 */
require('dotenv').config();
const sequelize = require('../config/db');

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return Number(rows[0]?.c) > 0;
}

async function addColumn(table, column, ddl) {
  if (await columnExists(table, column)) {
    console.log(`skip ${table}.${column} (exists)`);
    return;
  }
  await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);
  console.log(`added ${table}.${column}`);
}

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    const tables = ['announcements', 'course_announcements', 'competition_announcements'];

    for (const table of tables) {
      await addColumn(table, 'approval_status', "approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved'");
      await addColumn(table, 'approved_by', "approved_by INT NULL");
      await addColumn(table, 'rejection_reason', "rejection_reason TEXT NULL");
      await addColumn(table, 'email_sent', "email_sent TINYINT(1) NOT NULL DEFAULT 0");
    }

    console.log('Announcement approval schema patch complete.');
  } catch (e) {
    console.error('Patch failed:', e.parent?.sqlMessage || e.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
