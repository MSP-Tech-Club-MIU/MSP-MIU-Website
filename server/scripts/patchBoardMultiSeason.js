/**
 * Allow the same person on the board across seasons:
 * - Drop unique indexes on board.ID (university_id) and board.user_id if present
 * - Widen board.year to VARCHAR(20) for values like 2026-2027
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

async function columnMeta(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
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

    const indexes = await listIndexes('board');
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
      // Unique on identity fields blocks the same person in two seasons
      if (
        (cols.length === 1 && (cols[0] === 'id' || cols[0] === 'user_id' || cols[0] === 'email')) ||
        (cols.length === 1 && cols[0] === 'university_id')
      ) {
        await dropIndex('board', name);
      }
    }

    const yearCol = await columnMeta('board', 'year');
    if (yearCol && Number(yearCol.CHARACTER_MAXIMUM_LENGTH) > 0 && Number(yearCol.CHARACTER_MAXIMUM_LENGTH) < 20) {
      await sequelize.query(
        'ALTER TABLE `board` MODIFY COLUMN `year` VARCHAR(20) NOT NULL'
      );
      console.log('widened board.year to VARCHAR(20)');
    } else {
      console.log('board.year already wide enough or missing length info — skipped');
    }

    console.log('patchBoardMultiSeason complete');
  } catch (error) {
    console.error('patchBoardMultiSeason failed:', error.message || error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
