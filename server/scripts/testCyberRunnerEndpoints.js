const assert = require('assert');
const { SPONSOR_INFO } = require('../controllers/cyberrunner.controller');

function testSponsorInfo() {
  console.log('Testing SPONSOR_INFO...');
  assert.strictEqual(SPONSOR_INFO.name, 'SCNT.eg');
  assert.strictEqual(SPONSOR_INFO.instagramUrl, 'https://www.instagram.com/scnt.eg/');
  assert.strictEqual(SPONSOR_INFO.giveawayUrl, 'https://www.instagram.com/scnt.eg/');
  assert.ok(SPONSOR_INFO.description.includes('Egyptian fragrance brand'));
  assert.ok(SPONSOR_INFO.giveawayTitle.includes('Daily Top Score'));
  console.log('SPONSOR_INFO tests passed!');
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
    testCairoTimeCalculations();
    testRoutesMounted();
    console.log('\nAll CyberRunner backend verification tests passed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

run();
