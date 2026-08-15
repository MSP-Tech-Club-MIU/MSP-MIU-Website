/**
 * Targeted schema patches for CMS / board / competition fields.
 * Safe to re-run (skips existing columns/tables).
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

    // site_content table
    if (!(await tableExists('site_content'))) {
      await sequelize.query(`
        CREATE TABLE site_content (
          content_key VARCHAR(64) NOT NULL PRIMARY KEY,
          content_value JSON NOT NULL,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log('created site_content');
    } else {
      console.log('skip site_content (exists)');
    }

    // board CMS columns
    await addColumn('board', 'photo_url', 'photo_url VARCHAR(512) NULL');
    await addColumn('board', 'linkedin_url', 'linkedin_url VARCHAR(255) NULL');
    await addColumn('board', 'github_url', 'github_url VARCHAR(255) NULL');
    await addColumn('board', 'sort_order', 'sort_order INT NOT NULL DEFAULT 0');
    await addColumn('board', 'is_visible', 'is_visible TINYINT(1) NOT NULL DEFAULT 1');

    // competitions fields
    await addColumn('competitions', 'max_teams', 'max_teams INT NULL');
    await addColumn('competitions', 'registration_deadline', 'registration_deadline DATETIME NULL');

    // site announcements: optional email broadcast
    await addColumn(
      'announcements',
      'send_email',
      'send_email TINYINT(1) NOT NULL DEFAULT 0'
    );

    // users.score nulls that break full alter sync
    if (await columnExists('users', 'score')) {
      await sequelize.query('UPDATE users SET score = 0 WHERE score IS NULL');
      console.log('fixed users.score NULLs');
    }

    console.log('Schema patch complete.');
  } catch (e) {
    console.error('Patch failed:', e.parent?.sqlMessage || e.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
