/**
 * Ensure board.faculty is an ENUM matching Application/Member faculty order.
 * Safe to re-run.
 */
require('dotenv').config();
const sequelize = require('../config/db');

const FACULTY_ENUM = [
  'Computer Science',
  'Engineering Sciences & Arts - ECE',
  'Mass Communication',
  'Dentistry',
  'Engineering Sciences & Arts - Architecture',
  'Pharmacy',
  'Business',
  'Alsun'
];

const ENUM_SQL = FACULTY_ENUM.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ');

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

    const meta = await getColumnMeta('board', 'faculty');
    const desiredType = `enum(${ENUM_SQL})`.toLowerCase();

    if (!meta) {
      await sequelize.query(`
        ALTER TABLE board
        ADD COLUMN faculty ENUM(${ENUM_SQL}) NULL
        AFTER ID
      `);
      console.log('Added board.faculty as ENUM');
    } else if (String(meta.DATA_TYPE).toLowerCase() !== 'enum' ||
               String(meta.COLUMN_TYPE).toLowerCase() !== desiredType) {
      await sequelize.query(`
        ALTER TABLE board
        MODIFY COLUMN faculty ENUM(${ENUM_SQL}) NULL
      `);
      console.log('Updated board.faculty to ENUM matching Application faculties');
    } else {
      console.log('board.faculty ENUM already correct — skipped');
    }

    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('patchBoardFaculty failed:', err);
    process.exit(1);
  }
})();
