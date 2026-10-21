const assert = require('assert');
const {
  SPONSOR_INFO,
  getUniquePlayerBests,
  getMonthDateRange,
  getYearDateRange
} = require('../controllers/cyberrunner.controller');

function testDateRangeCalculations() {
  console.log('Testing Day, Month, and Year date range calculations...');

  // Month ranges: standard 31-day month
  const oct = getMonthDateRange('2026-10');
  assert.strictEqual(oct.startDate, '2026-10-01');
  assert.strictEqual(oct.endDate, '2026-10-31');

  // Month ranges: 30-day month
  const nov = getMonthDateRange('2026-11');
  assert.strictEqual(nov.startDate, '2026-11-01');
  assert.strictEqual(nov.endDate, '2026-11-30');

  // Month ranges: leap year February (2024 is leap)
  const febLeap = getMonthDateRange('2024-02');
  assert.strictEqual(febLeap.startDate, '2024-02-01');
  assert.strictEqual(febLeap.endDate, '2024-02-29');

  // Month ranges: non-leap year February (2025 is non-leap)
  const febNonLeap = getMonthDateRange('2025-02');
  assert.strictEqual(febNonLeap.startDate, '2025-02-01');
  assert.strictEqual(febNonLeap.endDate, '2025-02-28');

  // Year ranges
  const y2026 = getYearDateRange('2026');
  assert.strictEqual(y2026.startDate, '2026-01-01');
  assert.strictEqual(y2026.endDate, '2026-12-31');

  console.log('Date range calculations tests passed!');
}

function testSponsorInfo() {
  console.log('Testing SPONSOR_INFO...');
  assert.strictEqual(SPONSOR_INFO.name, 'SCNT.eg');
  assert.strictEqual(SPONSOR_INFO.instagramUrl, 'https://www.instagram.com/scnt.eg/');
  assert.strictEqual(SPONSOR_INFO.giveawayUrl, 'https://www.instagram.com/scnt.eg/');
  assert.ok(SPONSOR_INFO.description.includes('Egyptian fragrance brand'));
  assert.ok(SPONSOR_INFO.giveawayTitle.includes('Daily Top Score'));
  console.log('SPONSOR_INFO tests passed!');
}

function testUniquePlayerBests() {
  console.log('Testing getUniquePlayerBests logic for Today & All-Time leaderboards...');
  const testRuns = [
    { score_id: 1, player_name: 'Player One', user_id: 10, score: 5000, level: 10, tokens: 20 },
    { score_id: 2, player_name: 'Player One', user_id: 10, score: 3000, level: 6, tokens: 10 },
    { score_id: 3, player_name: 'guest_user', user_id: null, score: 4500, level: 9, tokens: 18 },
    { score_id: 4, player_name: 'GUEST_USER', user_id: null, score: 2000, level: 4, tokens: 5 },
    { score_id: 5, player_name: 'Unique Legend', user_id: null, score: 8000, level: 16, tokens: 40 },
    { score_id: 6, player_name: null, user_id: null, score: 1000, level: 2, tokens: 2 },
    // Another player playing on the same laptop/user_id (should NOT be collapsed)
    { score_id: 7, player_name: 'Player Two', user_id: 10, score: 6000, level: 12, tokens: 25 },
  ];

  // Already ordered by score DESC:
  testRuns.sort((a, b) => b.score - a.score);

  const bests = getUniquePlayerBests(testRuns, 10);

  // Expect distinct entries for: Unique Legend (8000), Player Two (6000), Player One (5000), guest_user (4500), and null name (1000)
  assert.strictEqual(bests.length, 5, 'Should not collapse different players sharing a user_id on the same device');
  assert.strictEqual(bests[0].player_name, 'Unique Legend');
  assert.strictEqual(bests[0].score, 8000);
  assert.strictEqual(bests[1].player_name, 'Player Two');
  assert.strictEqual(bests[1].score, 6000);
  assert.strictEqual(bests[2].player_name, 'Player One');
  assert.strictEqual(bests[2].score, 5000);
  assert.strictEqual(bests[3].player_name, 'guest_user');
  assert.strictEqual(bests[3].score, 4500);
  console.log('getUniquePlayerBests tests passed successfully!');
}

function testCairoTimeCalculations() {
  console.log('Testing Cairo timezone calculations...');
  const now = new Date();
  const cairoDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);

  assert.match(cairoDateStr, /^\d{4}-\d{2}-\d{2}$/);
  console.log('Current Cairo date formatted:', cairoDateStr);
  console.log('Cairo timezone tests passed!');
}

function testRoutesMounted() {
  console.log('Testing routes mounting in server.js...');
  const apiRouter = require('../server');
  assert.ok(apiRouter, 'API router loaded');
  console.log('Server router tests passed!');
}

async function run() {
  try {
    testSponsorInfo();
    testUniquePlayerBests();
    testCairoTimeCalculations();
    testDateRangeCalculations();
    testRoutesMounted();
    console.log('\nAll CyberRunner backend verification tests passed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

run();
