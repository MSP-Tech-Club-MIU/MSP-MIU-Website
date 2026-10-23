/**
 * Schema patch to:
 * 1. Add 'role' ENUM('member', 'delegate') NOT NULL DEFAULT 'member' to `members` table
 * 2. Alter `users`.`role` ENUM to include 'delegate'
 * 3. Alter `applications`.`status` ENUM to include 'accepted_delegate' and 'accepted_second_choice_delegate'
 * 
 * Safe and idempotent to run multiple times.
 */
require('dotenv').config();
const sequelize = require('../config/db');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // 1. Check & patch `members`.`role`
    const [memberCols] = await sequelize.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'members' 
        AND COLUMN_NAME = 'role'
    `);

    if (memberCols.length === 0) {
      console.log('Adding `role` column to `members` table...');
      await sequelize.query(`
        ALTER TABLE \`members\` 
        ADD COLUMN \`role\` ENUM('member', 'delegate') NOT NULL DEFAULT 'member' AFTER \`department_id\`
      `);
      console.log('Successfully added `role` column to `members`.');
    } else {
      console.log('Column `members`.`role` already exists:', memberCols[0].COLUMN_TYPE);
    }

    // 2. Check & patch `users`.`role`
    const [userCols] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'role'
    `);

    const userRoleType = userCols[0]?.COLUMN_TYPE || '';
    if (userRoleType.includes("'delegate'")) {
      console.log('Column `users`.`role` already includes delegate.');
    } else {
      console.log('Altering `users`.`role` to include delegate...');
      await sequelize.query(`
        ALTER TABLE \`users\` 
        MODIFY COLUMN \`role\` ENUM('member', 'delegate', 'board', 'admin', 'competitor', 'judge') NOT NULL DEFAULT 'member'
      `);
      console.log('Successfully altered `users`.`role`.');
    }

    // 3. Check & patch `applications`.`status`
    const [appCols] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'applications' 
        AND COLUMN_NAME = 'status'
    `);

    const appStatusType = appCols[0]?.COLUMN_TYPE || '';
    if (appStatusType.includes("'accepted_delegate'") && appStatusType.includes("'accepted_second_choice_delegate'")) {
      console.log('Column `applications`.`status` already includes delegate statuses.');
    } else {
      console.log('Altering `applications`.`status` to include accepted_delegate and accepted_second_choice_delegate...');
      await sequelize.query(`
        ALTER TABLE \`applications\` 
        MODIFY COLUMN \`status\` ENUM(
          'pending',
          'approved',
          'rejected',
          'accepted_second_choice',
          'accepted_delegate',
          'accepted_second_choice_delegate'
        ) NOT NULL DEFAULT 'pending'
      `);
      console.log('Successfully altered `applications`.`status`.');
    }

    console.log('--- Delegate schema patch completed successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('Patch failed:', err.parent?.sqlMessage || err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();
