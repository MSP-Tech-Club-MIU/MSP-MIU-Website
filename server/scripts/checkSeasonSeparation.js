/**
 * Full season-separation check for MSP-MIU.
 *
 * Validates:
 *  1) DB schema / indexes / null season_ids / uniqueness
 *  2) Static controller + client create patterns
 *  3) Runtime data isolation (no cross-season leakage on filtered lists)
 *  4) Returning-member enrollment identity (one User across seasons)
 *
 * Exit 0 = all required checks passed (warnings allowed)
 * Exit 1 = one or more failures
 *
 * Usage (from server/):
 *   npm run check:season-separation
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const {
  Application,
  Member,
  User,
  Board,
  Event,
  Sponsor,
  Competition,
  Announcement,
  AdminNotification,
  Season
} = require('../models');
const seasonFilter = require('../utils/seasonFilter');
const { enrollFromApplication } = require('../utils/memberEnrollment');

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

const LIST_CONTROLLERS = [
  {
    file: 'controllers/applications.js',
    mustInclude: ['resolveSeasonFilter', 'resolveSeasonIdForWrite']
  },
  {
    file: 'controllers/members.js',
    mustInclude: ['resolveSeasonFilter', 'resolveSeasonIdForWrite']
  },
  {
    file: 'controllers/board.js',
    mustInclude: ['resolveSeasonFilter', 'resolveSeasonIdForWrite']
  },
  {
    file: 'controllers/events.js',
    mustInclude: ['resolveSeasonFilter', 'resolveSeasonIdForWrite']
  },
  {
    file: 'controllers/sponsor.js',
    mustInclude: ['resolveSeasonFilter', 'resolveSeasonIdForWrite']
  },
  {
    file: 'controllers/competitions.js',
    mustInclude: ['resolveSeasonFilter', 'resolveSeasonIdForWrite']
  },
  {
    file: 'controllers/announcements.js',
    mustInclude: ['resolveSeasonFilter', 'resolveSeasonIdForWrite']
  },
  {
    file: 'controllers/admin.js',
    mustInclude: ['resolveSeasonFilter', 'resolveSeasonIdForWrite']
  },
  {
    file: 'controllers/emailTemplates.js',
    mustInclude: ['resolveSeasonFilter']
  }
];

const CLIENT_CREATE_CHECKS = [
  {
    file: '../client/src/pages/Admin/EventsAdminTab.jsx',
    patterns: [/selectedSeasonId/, /season_id\s*=\s*selectedSeasonId|payload\.season_id/]
  },
  {
    file: '../client/src/pages/Admin/BoardAdminTab.jsx',
    patterns: [/selectedSeasonId/, /payload\.season_id/]
  },
  {
    file: '../client/src/pages/Admin/SponsorsAdminTab.jsx',
    patterns: [/selectedSeasonId/, /payload\.season_id/]
  },
  {
    file: '../client/src/pages/Admin/AdminPanel.jsx',
    patterns: [/selectedSeasonId/, /payload\.season_id/]
  },
  {
    file: '../client/src/pages/Admin/CompetitionManagement.jsx',
    patterns: [/selectedSeasonId/, /season_id/]
  }
];

const results = { pass: [], warn: [], fail: [] };

function pass(msg) {
  results.pass.push(msg);
  console.log(`  ✅ ${msg}`);
}
function warn(msg) {
  results.warn.push(msg);
  console.log(`  ⚠️  ${msg}`);
}
function fail(msg) {
  results.fail.push(msg);
  console.log(`  ❌ ${msg}`);
}

async function tableExists(table) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [table] }
  );
  return Number(rows[0]?.c) > 0;
}

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return Number(rows[0]?.c) > 0;
}

async function listUniqueIndexes(table) {
  if (!(await tableExists(table))) return [];
  const [rows] = await sequelize.query(`SHOW INDEX FROM \`${table}\``);
  const byName = new Map();
  for (const row of rows) {
    if (row.Non_unique !== 0) continue;
    if (row.Key_name === 'PRIMARY') continue;
    if (!byName.has(row.Key_name)) byName.set(row.Key_name, []);
    byName.get(row.Key_name).push(String(row.Column_name).toLowerCase());
  }
  return [...byName.entries()].map(([name, cols]) => ({ name, cols }));
}

async function countNullSeason(table) {
  if (!(await tableExists(table)) || !(await columnExists(table, 'season_id'))) {
    return null;
  }
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c FROM \`${table}\` WHERE season_id IS NULL`
  );
  return Number(rows[0]?.c || 0);
}

function readServerFile(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

function readRepoFile(relFromServer) {
  return fs.readFileSync(path.join(__dirname, '..', relFromServer), 'utf8');
}

async function checkDefaultSeason() {
  console.log('\n── 1. Default season invariant ──');
  const [rows] = await sequelize.query(
    `SELECT season_id, label, is_default FROM seasons ORDER BY season_id`
  );
  const defaults = rows.filter((r) => Number(r.is_default) === 1);
  if (defaults.length === 1) {
    pass(`Exactly one default season: ${defaults[0].label} (id=${defaults[0].season_id})`);
  } else if (defaults.length === 0) {
    fail('No default season (is_default=1) — list filters may leak all seasons');
  } else {
    fail(`Multiple default seasons (${defaults.length}): ${defaults.map((d) => d.label).join(', ')}`);
  }
  if (rows.length < 1) fail('No seasons configured');
  else pass(`${rows.length} season(s) present`);
}

async function checkSchemaUniques() {
  console.log('\n── 2. Schema uniqueness (season-scoped identity) ──');

  for (const table of ['applications', 'members']) {
    if (!(await tableExists(table))) {
      warn(`${table} table missing — skipped`);
      continue;
    }
    const uniques = await listUniqueIndexes(table);
    const globalUni = uniques.filter(
      (u) => u.cols.length === 1 && u.cols[0] === 'university_id'
    );
    const composite = uniques.filter(
      (u) =>
        u.cols.length === 2 &&
        u.cols.includes('university_id') &&
        u.cols.includes('season_id')
    );
    if (globalUni.length) {
      fail(
        `${table}: global UNIQUE(university_id) still present (${globalUni.map((u) => u.name).join(', ')}). Run npm run patch:members-multi-season`
      );
    } else {
      pass(`${table}: no global UNIQUE(university_id)`);
    }
    if (composite.length) {
      pass(`${table}: composite UNIQUE(university_id, season_id) via ${composite[0].name}`);
    } else {
      fail(`${table}: missing UNIQUE(university_id, season_id)`);
    }
  }

  if (await tableExists('board')) {
    const uniques = await listUniqueIndexes('board');
    const blocking = uniques.filter(
      (u) =>
        u.cols.length === 1 &&
        ['id', 'university_id', 'user_id', 'email'].includes(u.cols[0])
    );
    if (blocking.length) {
      fail(
        `board: blocking global unique(s) ${blocking.map((u) => `${u.name}(${u.cols})`).join(', ')}. Run npm run patch:board-multi-season`
      );
    } else {
      pass('board: no global unique on identity fields (multi-season OK)');
    }
  }

  if (await tableExists('users')) {
    const uniques = await listUniqueIndexes('users');
    const emailU = uniques.some((u) => u.cols.length === 1 && u.cols[0] === 'email');
    const uniU = uniques.some((u) => u.cols.length === 1 && u.cols[0] === 'university_id');
    if (emailU) pass('users: email remains globally unique (one account)');
    else fail('users: email should stay globally unique');
    if (uniU) pass('users: university_id remains globally unique (one account)');
    else warn('users: university_id not uniquely indexed (nullable OK, but preferred unique)');
  }
}

async function checkNullSeasonIds() {
  console.log('\n── 3. Null season_id on scoped tables ──');
  for (const table of SCOPED_TABLES) {
    const n = await countNullSeason(table);
    if (n === null) {
      warn(`${table}: missing or no season_id column`);
      continue;
    }
    if (n === 0) pass(`${table}: 0 null season_id rows`);
    else fail(`${table}: ${n} row(s) with NULL season_id (invisible under normal filters)`);
  }
}

async function checkStaticControllers() {
  console.log('\n── 4. Controller seasonFilter wiring ──');
  for (const item of LIST_CONTROLLERS) {
    let src;
    try {
      src = readServerFile(item.file);
    } catch {
      fail(`Cannot read ${item.file}`);
      continue;
    }
    const missing = item.mustInclude.filter((s) => !src.includes(s));
    if (missing.length) fail(`${item.file}: missing ${missing.join(', ')}`);
    else pass(`${item.file}: imports ${item.mustInclude.join(', ')}`);
  }

  // Critical: resolveSeasonFilter must not return empty where when no default
  const filterSrc = readServerFile('utils/seasonFilter.js');
  if (
    /mode === 'current'[\s\S]{0,400}where:\s*\{\s*\}/.test(filterSrc) &&
    !/No default season configured/.test(filterSrc)
  ) {
    fail(
      'seasonFilter.resolveSeasonFilter: empty where when no default season (cross-season leak)'
    );
  } else if (/No default season configured/.test(filterSrc)) {
    pass('seasonFilter: refuses unfiltered list when no default season');
  } else {
    // Heuristic pass if current mode always sets season_id
    if (/where:\s*\{\s*season_id:/.test(filterSrc)) {
      pass('seasonFilter: current mode sets season_id where clause');
    } else {
      warn('seasonFilter: could not verify no-default guard — review manually');
    }
  }

  const adminSrc = readServerFile('controllers/admin.js');
  if (/Attendance\.count\(\s*\{\s*where:\s*\{\s*attended:\s*false\s*\}\s*\}\s*\)/.test(adminSrc)) {
    fail('admin dashboard pendingAttendance is not season-filtered');
  } else if (
    /pendingAttendance/.test(adminSrc) &&
    /attended:\s*false/.test(adminSrc) &&
    /season_id:\s*seasonWhere\.season_id/.test(adminSrc)
  ) {
    pass('admin dashboard pendingAttendance is season-aware via events');
  } else {
    warn('admin pendingAttendance: review season join manually');
  }

  if (/Board\.findAll\(\s*\{\s*where:\s*\{\s*user_id:/.test(adminSrc) &&
      !/getCompetitionJudges[\s\S]{0,800}season_id/.test(adminSrc)) {
    // softer check below with more context
  }
  const judgesFn = adminSrc.match(
    /const getCompetitionJudges[\s\S]*?(?=const updateCompetitionJudges|const get)/
  );
  if (judgesFn && judgesFn[0].includes('season_id')) {
    pass('getCompetitionJudges filters board candidates by competition season');
  } else if (judgesFn) {
    fail('getCompetitionJudges loads board candidates without season filter');
  }
}

async function checkClientCreates() {
  console.log('\n── 5. Admin UI create paths pass season_id ──');
  for (const item of CLIENT_CREATE_CHECKS) {
    let src;
    try {
      src = readRepoFile(item.file);
    } catch {
      fail(`Cannot read ${item.file}`);
      continue;
    }
    const ok = item.patterns.every((re) => re.test(src));
    if (ok) pass(`${path.basename(item.file)}: create includes selected season`);
    else fail(`${path.basename(item.file)}: create may ignore admin season selector`);
  }
}

async function checkRuntimeListIsolation() {
  console.log('\n── 6. Runtime list isolation ──');
  const defaultId = await seasonFilter.getDefaultSeasonId();
  if (!defaultId) {
    fail('Cannot run list isolation — no default season');
    return;
  }

  const seasons = await Season.findAll({ order: [['season_id', 'ASC']] });
  if (seasons.length < 2) {
    warn('Only one season — cross-season isolation sample limited');
  }

  const models = [
    { name: 'Application', Model: Application },
    { name: 'Member', Model: Member },
    { name: 'Board', Model: Board },
    { name: 'Event', Model: Event },
    { name: 'Sponsor', Model: Sponsor },
    { name: 'Competition', Model: Competition },
    { name: 'Announcement', Model: Announcement },
    { name: 'AdminNotification', Model: AdminNotification }
  ];

  for (const { name, Model } of models) {
    const filter = await seasonFilter.resolveSeasonFilter({ season_id: String(defaultId) });
    const rows = await Model.findAll({
      where: filter.where,
      attributes: ['season_id'],
      limit: 200
    });
    const leaked = rows.filter((r) => Number(r.season_id) !== Number(defaultId));
    if (leaked.length) {
      fail(`${name}: ${leaked.length} row(s) leaked outside season ${defaultId} under filter`);
    } else {
      pass(`${name}: filter season_id=${defaultId} returned ${rows.length} in-season row(s)`);
    }
  }

  // Duplicate identity within a single season
  for (const table of ['applications', 'members']) {
    if (!(await tableExists(table))) continue;
    const [dups] = await sequelize.query(
      `SELECT university_id, season_id, COUNT(*) AS c
       FROM \`${table}\`
       WHERE university_id IS NOT NULL AND season_id IS NOT NULL
       GROUP BY university_id, season_id
       HAVING c > 1
       LIMIT 10`
    );
    if (dups.length) {
      fail(
        `${table}: duplicate university_id within season — e.g. ${dups[0].university_id} season ${dups[0].season_id} x${dups[0].c}`
      );
    } else {
      pass(`${table}: no duplicate university_id within the same season`);
    }
  }

  // Cross-season reuse should be possible (informational if data exists)
  const [cross] = await sequelize.query(
    `SELECT university_id, COUNT(DISTINCT season_id) AS seasons
     FROM members
     WHERE university_id IS NOT NULL AND season_id IS NOT NULL
     GROUP BY university_id
     HAVING seasons > 1
     LIMIT 5`
  );
  if (cross.length) {
    pass(
      `members: cross-season reuse present (e.g. ${cross[0].university_id} in ${cross[0].seasons} seasons)`
    );
  } else {
    warn('members: no cross-season university_id pairs yet (OK if new platform)');
  }
}

async function checkEnrollmentIsolation() {
  console.log('\n── 7. Returning-member enrollment (transaction rolled back) ──');
  const seasons = await Season.findAll({ order: [['season_id', 'ASC']] });
  const memberWithUser = await Member.findOne({
    where: { user_id: { [Op.ne]: null } }
  });
  if (!memberWithUser || seasons.length < 1) {
    warn('Skipped enrollment simulation — need a linked member+user');
    return;
  }

  const user = await User.findByPk(memberWithUser.user_id);
  const otherSeason =
    seasons.find((s) => s.season_id !== memberWithUser.season_id) || seasons[0];
  const depts = await sequelize.query(
    `SELECT department_id FROM departments ORDER BY department_id LIMIT 5`
  );
  const deptRows = depts[0] || [];
  const otherDeptId =
    deptRows.find((d) => Number(d.department_id) !== Number(memberWithUser.department_id))
      ?.department_id || deptRows[0]?.department_id;

  if (!otherDeptId) {
    warn('Skipped enrollment simulation — no departments');
    return;
  }

  const t = await sequelize.transaction();
  try {
    const [app] = await Application.findOrCreate({
      where: {
        university_id: memberWithUser.university_id,
        season_id: otherSeason.season_id
      },
      defaults: {
        full_name: memberWithUser.full_name,
        email: memberWithUser.email,
        faculty: 'Computer Science',
        year: memberWithUser.year || 3,
        phone_number: memberWithUser.phone_number || '01000000000',
        first_choice: otherDeptId,
        skills: 'season-check',
        motivation: 'season-check',
        interview: 'online',
        status: 'approved',
        season_id: otherSeason.season_id
      },
      transaction: t
    });
    await app.update(
      { status: 'approved', first_choice: otherDeptId },
      { transaction: t }
    );

    const result = await enrollFromApplication(app, {
      departmentId: otherDeptId,
      transaction: t
    });
    await user.reload({ transaction: t });

    const sameUser = result.member.user_id === user.user_id;
    const deptOk = Number(user.department_id) === Number(otherDeptId);
    const seasonOk = Number(user.season_id) === Number(otherSeason.season_id);
    const userCount = await User.count({
      where: {
        [Op.or]: [
          { university_id: memberWithUser.university_id },
          { email: memberWithUser.email }
        ]
      },
      transaction: t
    });

    if (sameUser && deptOk && seasonOk && userCount === 1) {
      pass(
        `enrollFromApplication: same user_id=${user.user_id}, dept→${otherDeptId}, season→${otherSeason.season_id}, no duplicate account`
      );
    } else {
      fail(
        `enrollFromApplication assertions failed (sameUser=${sameUser}, dept=${deptOk}, season=${seasonOk}, userCount=${userCount})`
      );
    }
    await t.rollback();
  } catch (e) {
    try {
      await t.rollback();
    } catch (_) {
      /* ignore */
    }
    fail(`enrollFromApplication simulation error: ${e.message}`);
  }
}

async function checkAuthSeasonGates() {
  console.log('\n── 8. Auth season gates ──');
  const adminSrc = readServerFile('middlewares/adminAuth.js');
  const judgingSrc = readServerFile('middlewares/judgingAuth.js');
  if (adminSrc.includes('getDefaultSeasonId') && adminSrc.includes('season_id')) {
    pass('adminAuth: board eligibility gated to default season');
  } else {
    fail('adminAuth: missing default-season board gate');
  }
  if (judgingSrc.includes('getDefaultSeasonId') && judgingSrc.includes('season_id')) {
    pass('judgingAuth: board eligibility prefers default season');
  } else {
    warn('judgingAuth: default-season gate not clearly present');
  }
}

async function main() {
  console.log('══════════════════════════════════════════════');
  console.log(' MSP-MIU Season Separation Check');
  console.log('══════════════════════════════════════════════');

  await sequelize.authenticate();

  await checkDefaultSeason();
  await checkSchemaUniques();
  await checkNullSeasonIds();
  await checkStaticControllers();
  await checkClientCreates();
  await checkRuntimeListIsolation();
  await checkEnrollmentIsolation();
  await checkAuthSeasonGates();

  console.log('\n══════════════════════════════════════════════');
  console.log(
    ` Summary: ${results.pass.length} passed, ${results.warn.length} warnings, ${results.fail.length} failed`
  );
  console.log('══════════════════════════════════════════════');

  if (results.fail.length) {
    console.log('\nFailures:');
    results.fail.forEach((m) => console.log(`  - ${m}`));
  }
  if (results.warn.length) {
    console.log('\nWarnings:');
    results.warn.forEach((m) => console.log(`  - ${m}`));
  }

  await sequelize.close();
  process.exitCode = results.fail.length ? 1 : 0;
}

main().catch(async (e) => {
  console.error('Fatal:', e);
  try {
    await sequelize.close();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
