/**
 * Suggestions schema: allow public (guest) submissions.
 * - member_id nullable
 * - add optional name / email columns
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

async function isNullable(table, column) {
  const [rows] = await sequelize.query(
    `SELECT IS_NULLABLE AS n
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return rows[0]?.n === 'YES';
}

async function run() {
  const table = 'suggestions';

  if (!(await columnExists(table, 'suggestion_id'))) {
    console.log('suggestions table not found — skipping');
    process.exit(0);
  }

  if (await columnExists(table, 'member_id')) {
    const nullable = await isNullable(table, 'member_id');
    if (!nullable) {
      await sequelize.query(
        `ALTER TABLE \`${table}\` MODIFY COLUMN \`member_id\` INT NULL`
      );
      console.log('Made member_id nullable');
    } else {
      console.log('member_id already nullable');
    }
  }

  if (!(await columnExists(table, 'name'))) {
    await sequelize.query(
      `ALTER TABLE \`${table}\` ADD COLUMN \`name\` VARCHAR(120) NULL AFTER \`member_id\``
    );
    console.log('Added name column');
  } else {
    console.log('name column already exists');
  }

  if (!(await columnExists(table, 'email'))) {
    await sequelize.query(
      `ALTER TABLE \`${table}\` ADD COLUMN \`email\` VARCHAR(255) NULL AFTER \`name\``
    );
    console.log('Added email column');
  } else {
    console.log('email column already exists');
  }

  console.log('Suggestion schema patch complete');
  process.exit(0);
}

run().catch((err) => {
  console.error('patchSuggestionSchema failed:', err);
  process.exit(1);
});
