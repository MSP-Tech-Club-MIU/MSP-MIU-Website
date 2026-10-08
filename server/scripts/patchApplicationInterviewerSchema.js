/**
 * Ensure applications table has interviewer_name and interview_status columns.
 * Safe to re-run.
 */
require('dotenv').config();
const sequelize = require('../config/db');

async function getColumnMeta(table, column) {
  const [rows] = await sequelize.query(
    `SELECT DATA_TYPE, COLUMN_TYPE, IS_NULLABLE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return rows[0] || null;
}

(async () => {
  try {
    await sequelize.authenticate();

    const interviewerMeta = await getColumnMeta('applications', 'interviewer_name');
    if (!interviewerMeta) {
      await sequelize.query(`
        ALTER TABLE applications
        ADD COLUMN interviewer_name VARCHAR(100) NULL
      `);
      console.log('Added applications.interviewer_name column');
    } else {
      console.log('applications.interviewer_name already exists — skipped');
    }

    const statusMeta = await getColumnMeta('applications', 'interview_status');
    if (!statusMeta) {
      await sequelize.query(`
        ALTER TABLE applications
        ADD COLUMN interview_status VARCHAR(50) NULL
      `);
      console.log('Added applications.interview_status column');
    } else {
      console.log('applications.interview_status already exists — skipped');
    }

    console.log('Interviewer schema patch complete.');
    process.exit(0);
  } catch (err) {
    console.error('patchApplicationInterviewerSchema failed:', err);
    process.exit(1);
  }
})();
