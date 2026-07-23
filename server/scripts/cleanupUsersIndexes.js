/**
 * List indexes on users and drop obvious duplicate FK indexes left by
 * sequelize.sync({ alter: true }) churn. Keeps PRIMARY, unique email/university_id,
 * department FK, and season_id index/FK.
 *
 * Dry-run by default. Apply with: node server/scripts/cleanupUsersIndexes.js --apply
 */
require('dotenv').config();
const sequelize = require('../config/db');

const KEEP = new Set([
  'PRIMARY',
  'email',
  'email_2', // sometimes sequelize names uniques this way
  'university_id',
  'university_id_2',
  'users_email_unique',
  'users_university_id_unique',
  'idx_users_season_id',
  'fk_users_season_id',
]);

function shouldKeep(indexName) {
  if (KEEP.has(indexName)) return true;
  // Keep any unique on email / university_id regardless of name
  const lower = String(indexName || '').toLowerCase();
  if (lower.includes('email') && lower.includes('unique')) return true;
  if (lower.includes('university') && lower.includes('unique')) return true;
  if (lower === 'fk_users_season_id' || lower.includes('season')) return true;
  return false;
}

(async () => {
  const apply = process.argv.includes('--apply');
  try {
    await sequelize.authenticate();
    const [rows] = await sequelize.query(`SHOW INDEX FROM \`users\``);
    const byKey = new Map();
    for (const row of rows) {
      const name = row.Key_name;
      if (!byKey.has(name)) {
        byKey.set(name, {
          name,
          unique: row.Non_unique === 0,
          columns: [],
        });
      }
      byKey.get(name).columns.push(row.Column_name);
    }

    console.log(`users has ${byKey.size} indexes/keys (MySQL max 64):\n`);
    for (const idx of byKey.values()) {
      const keep = shouldKeep(idx.name);
      console.log(
        `  ${keep ? 'KEEP' : 'DROP?'}  ${idx.name}  unique=${idx.unique}  cols=${idx.columns.join(',')}`
      );
    }

    // Drop candidates: non-PRIMARY indexes that look like auto-generated FK duplicates
    // (users_ibfk_N, or many indexes on same column)
    const dropList = [...byKey.keys()].filter((name) => {
      if (shouldKeep(name)) return false;
      if (/^users_ibfk_\d+$/i.test(name)) return true;
      if (/^fk_/i.test(name) && !/season/i.test(name)) {
        // keep department FK if it's the only one — drop only numbered duplicates
        return /_\d+$/.test(name) || /ibfk/i.test(name);
      }
      return false;
    });

    // Also: if many indexes share the exact same single column, keep one
    const colToIndexes = new Map();
    for (const idx of byKey.values()) {
      if (idx.name === 'PRIMARY') continue;
      const key = idx.columns.join(',');
      if (!colToIndexes.has(key)) colToIndexes.set(key, []);
      colToIndexes.get(key).push(idx);
    }
    for (const [, list] of colToIndexes) {
      if (list.length <= 1) continue;
      // keep first KEEP-named or first unique, drop the rest
      const sorted = [...list].sort((a, b) => {
        const aKeep = shouldKeep(a.name) ? 0 : 1;
        const bKeep = shouldKeep(b.name) ? 0 : 1;
        if (aKeep !== bKeep) return aKeep - bKeep;
        if (a.unique !== b.unique) return a.unique ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      for (const extra of sorted.slice(1)) {
        if (!dropList.includes(extra.name) && !shouldKeep(extra.name)) {
          dropList.push(extra.name);
        }
      }
    }

    const uniqueDrop = [...new Set(dropList)];
    console.log(`\nProposed drops (${uniqueDrop.length}): ${uniqueDrop.join(', ') || '(none)'}`);

    if (!apply) {
      console.log('\nDry-run only. Re-run with --apply to drop.');
      return;
    }

    for (const name of uniqueDrop) {
      // FK constraints must be dropped as FOREIGN KEY; indexes as INDEX
      const [fkRows] = await sequelize.query(
        `SELECT CONSTRAINT_NAME
         FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'users'
           AND CONSTRAINT_NAME = ?
           AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
        { replacements: [name] }
      );
      if (fkRows.length) {
        await sequelize.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`${name}\``);
        console.log(`dropped FK ${name}`);
      } else {
        try {
          await sequelize.query(`ALTER TABLE \`users\` DROP INDEX \`${name}\``);
          console.log(`dropped INDEX ${name}`);
        } catch (e) {
          console.log(`skip ${name}: ${e.parent?.sqlMessage || e.message}`);
        }
      }
    }

    const [after] = await sequelize.query(`SHOW INDEX FROM \`users\``);
    const afterKeys = new Set(after.map((r) => r.Key_name));
    console.log(`\nDone. users now has ${afterKeys.size} indexes/keys.`);
  } catch (e) {
    console.error('Cleanup failed:', e.parent?.sqlMessage || e.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
