/**
 * Schema patch to add 'accepted_second_choice' to the applications table status enum.
 * Safe to re-run.
 */
require('dotenv').config();
const sequelize = require('../config/db');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // In MySQL, check if column enum definition needs update
    const [rows] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'applications' 
        AND COLUMN_NAME = 'status'
    `);

    const colType = rows[0]?.COLUMN_TYPE || '';
    if (colType.includes('accepted_second_choice')) {
      console.log('applications.status already includes accepted_second_choice enum.');
    } else {
      console.log('Altering applications.status enum to include accepted_second_choice...');
      await sequelize.query(`
        ALTER TABLE \`applications\` 
        MODIFY COLUMN \`status\` ENUM('pending', 'approved', 'rejected', 'accepted_second_choice') NOT NULL DEFAULT 'pending'
      `);
      console.log('Successfully altered applications.status enum.');
    }
  } catch (err) {
    console.error('Patch failed:', err.parent?.sqlMessage || err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
