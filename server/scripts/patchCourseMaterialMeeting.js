/**
 * Targeted schema patch to add 'meeting' to course_lesson_materials.material_type.
 * Safe to re-run.
 */
require('dotenv').config();
const sequelize = require('../config/db');

async function tableExists(table) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    { replacements: [table] }
  );
  return Number(rows[0]?.c) > 0;
}

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    const table = 'course_lesson_materials';
    if (await tableExists(table)) {
      await sequelize.query(
        `ALTER TABLE \`${table}\` MODIFY COLUMN \`material_type\` ENUM('youtube', 'meeting', 'document', 'zip', 'code', 'other') NOT NULL`
      );
      console.log(`Successfully altered \`${table}\`.column \`material_type\` to include 'meeting'.`);
    } else {
      console.log(`Table \`${table}\` not found — skipping (sync will handle it).`);
    }

    console.log('Course material meeting schema patch complete.');
  } catch (e) {
    console.error('Patch failed:', e.parent?.sqlMessage || e.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
