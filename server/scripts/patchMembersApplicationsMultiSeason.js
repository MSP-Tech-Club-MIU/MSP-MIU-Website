/**
 * Allow the same student across seasons (applications + members):
 * - Drop global UNIQUE on university_id
 * - Add composite UNIQUE (university_id, season_id)
 * Safe to re-run.
 */
require('dotenv').config();
const sequelize = require('../config/db');

async function listIndexes(table) {
  const [rows] = await sequelize.query(`SHOW INDEX FROM \`${table}\``);
  return rows;
}

async function dropIndex(table, indexName) {
  await sequelize.query(`ALTER TABLE \`${table}\` DROP INDEX \`${indexName}\``);
  console.log(`dropped INDEX ${table}.${indexName}`);
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

async function patchTable(table) {
  if (!(await tableExists(table))) {
    console.log(`skip ${table} (table missing)`);
    return;
  }

  const indexes = await listIndexes(table);
  const byName = new Map();
  for (const row of indexes) {
    if (!byName.has(row.Key_name)) {
      byName.set(row.Key_name, { unique: row.Non_unique === 0, cols: [] });
    }
    byName.get(row.Key_name).cols.push(row.Column_name);
  }

  for (const [name, info] of byName.entries()) {
    if (name === 'PRIMARY') continue;
    if (!info.unique) continue;
    const cols = info.cols.map((c) => String(c).toLowerCase());
    // Global unique on university_id blocks Season 2 re-enrollment
    if (cols.length === 1 && cols[0] === 'university_id') {
      await dropIndex(table, name);
    }
  }

  const compositeName = `uniq_${table}_university_season`;
  if (!(await indexExists(table, compositeName))) {
    // Ensure season_id is present for existing rows before unique constraint
    const [nullRows] = await sequelize.query(
      `SELECT COUNT(*) AS c FROM \`${table}\` WHERE season_id IS NULL`
    );
    if (Number(nullRows[0]?.c || 0) > 0) {
      const [defaultSeason] = await sequelize.query(
        `SELECT season_id FROM seasons WHERE is_default = 1 LIMIT 1`
      );
      const seasonId = defaultSeason[0]?.season_id;
      if (!seasonId) {
        throw new Error(`Cannot backfill ${table}.season_id — no default season`);
      }
      await sequelize.query(
        `UPDATE \`${table}\` SET season_id = ? WHERE season_id IS NULL`,
        { replacements: [seasonId] }
      );
      console.log(`backfilled ${table}.season_id nulls → default season ${seasonId}`);
    }

    await sequelize.query(
      `ALTER TABLE \`${table}\` ADD UNIQUE INDEX \`${compositeName}\` (university_id, season_id)`
    );
    console.log(`added UNIQUE ${table}.${compositeName} (university_id, season_id)`);
  } else {
    console.log(`skip ${table}.${compositeName} (exists)`);
  }
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

(async () => {
  try {
    await sequelize.authenticate();
    await patchTable('applications');
    await patchTable('members');
    console.log('patchMembersApplicationsMultiSeason complete');
  } catch (error) {
    console.error('patchMembersApplicationsMultiSeason failed:', error.message || error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
