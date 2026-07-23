/**
 * Season schema: create seasons table, add season_id FKs, seed 25/26, backfill all rows.
 * Safe to re-run (skips existing columns/tables/seed).
 */
require('dotenv').config();
const sequelize = require('../config/db');

const SCOPED_TABLES = [
  'board',
  'events',
  'sponsors',
  'competitions',
  'announcements',
  'applications',
  'members',
  'admin_notifications',
  'users'
];

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

async function indexExists(table, indexName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    { replacements: [table, indexName] }
  );
  return Number(rows[0]?.c) > 0;
}

async function fkExists(table, fkName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c
     FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    { replacements: [table, fkName] }
  );
  return Number(rows[0]?.c) > 0;
}

(async () => {
  try {
    await sequelize.authenticate();

    if (!(await tableExists('seasons'))) {
      await sequelize.query(`
        CREATE TABLE seasons (
          season_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          label VARCHAR(10) NOT NULL UNIQUE,
          start_year INT NOT NULL,
          end_year INT NOT NULL,
          is_default TINYINT(1) NOT NULL DEFAULT 0,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          sort_order INT NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log('created seasons');
    } else {
      console.log('skip seasons (exists)');
    }

    // Seed 25/26 as default if missing
    let [existing] = await sequelize.query(
      `SELECT season_id FROM seasons WHERE label = '25/26' LIMIT 1`
    );
    if (!existing.length) {
      await sequelize.query(
        `UPDATE seasons SET is_default = 0 WHERE is_default = 1`
      );
      await sequelize.query(
        `INSERT INTO seasons (label, start_year, end_year, is_default, is_active, sort_order)
         VALUES ('25/26', 2025, 2026, 1, 1, 0)`
      );
      // mysql2/sequelize insertId is unreliable across drivers — re-select
      [existing] = await sequelize.query(
        `SELECT season_id FROM seasons WHERE label = '25/26' LIMIT 1`
      );
      console.log('seeded season 25/26');
    }

    const seasonId = existing[0]?.season_id;
    if (!seasonId) {
      throw new Error('Failed to resolve season_id for 25/26 after seed');
    }

    await sequelize.query(
      `UPDATE seasons SET is_default = CASE WHEN season_id = ? THEN 1 ELSE 0 END`,
      { replacements: [seasonId] }
    );
    console.log(`using season 25/26 (id=${seasonId}) as default`);

    for (const table of SCOPED_TABLES) {
      if (!(await tableExists(table))) {
        console.log(`skip ${table} (table missing)`);
        continue;
      }

      if (!(await columnExists(table, 'season_id'))) {
        await sequelize.query(
          `ALTER TABLE \`${table}\` ADD COLUMN season_id INT NULL`
        );
        console.log(`added ${table}.season_id`);
      } else {
        console.log(`skip ${table}.season_id (exists)`);
      }

      const [nullCountRows] = await sequelize.query(
        `SELECT COUNT(*) AS c FROM \`${table}\` WHERE season_id IS NULL`
      );
      const nullCount = Number(nullCountRows[0]?.c || 0);
      if (nullCount > 0) {
        await sequelize.query(
          `UPDATE \`${table}\` SET season_id = ? WHERE season_id IS NULL`,
          { replacements: [seasonId] }
        );
        console.log(`backfilled ${table}: ${nullCount} rows → 25/26`);
      }

      const idxName = `idx_${table}_season_id`;
      if (!(await indexExists(table, idxName))) {
        try {
          await sequelize.query(
            `CREATE INDEX \`${idxName}\` ON \`${table}\` (season_id)`
          );
          console.log(`indexed ${table}.season_id`);
        } catch (e) {
          console.log(`skip index ${idxName}: ${e.parent?.sqlMessage || e.message}`);
        }
      }

      const fkName = `fk_${table}_season_id`;
      if (!(await fkExists(table, fkName))) {
        try {
          await sequelize.query(
            `ALTER TABLE \`${table}\`
             ADD CONSTRAINT \`${fkName}\`
             FOREIGN KEY (season_id) REFERENCES seasons (season_id)
             ON UPDATE CASCADE ON DELETE RESTRICT`
          );
          console.log(`fk ${fkName}`);
        } catch (e) {
          console.log(`skip fk ${fkName}: ${e.parent?.sqlMessage || e.message}`);
        }
      }
    }

    console.log('Season schema patch complete.');
  } catch (e) {
    console.error('Patch failed:', e.parent?.sqlMessage || e.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
