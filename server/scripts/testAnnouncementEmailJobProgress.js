/**
 * End-to-end test for announcement email job + progress polling.
 *
 * Usage:
 *   node server/scripts/testAnnouncementEmailJobProgress.js
 *
 * Optional env:
 *   ANNOUNCEMENT_TEST_EMAIL=you@example.com   — send only to this address (dry subset)
 *   ANNOUNCEMENT_TEST_DRY_RUN=1               — do not call SMTP; simulate sends
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
require('dotenv').config();

const {
  createAnnouncementEmailJob,
  getAnnouncementEmailJob,
  publicJobView,
  runAnnouncementEmailJob
} = require('../services/announcementEmailJob');

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const dryRun = String(process.env.ANNOUNCEMENT_TEST_DRY_RUN || '').trim() === '1';
  const onlyTo = (process.env.ANNOUNCEMENT_TEST_EMAIL || '').trim();

  const announcement = {
    announcement_id: 0,
    title: 'E2E progress test',
    description: 'Testing async announcement email progress tracking.',
    department: 'Technical',
    announcement_date: new Date().toISOString().slice(0, 10),
    cta_label: 'View on MSP MIU',
    cta_url: (process.env.FRONTEND_URL || 'https://msp-miu.tech').replace(/\/$/, '')
  };

  // Patch User.findAll / sendEmail for controlled e2e when dry-run or single recipient
  const models = require('../models');
  const originalFindAll = models.User.findAll.bind(models.User);

  if (onlyTo || dryRun) {
    models.User.findAll = async () => {
      if (onlyTo) return [{ email: onlyTo }];
      return [
        { email: 'progress-test-1@example.com' },
        { email: 'progress-test-2@example.com' },
        { email: 'progress-test-3@example.com' }
      ];
    };
  }

  const job = createAnnouncementEmailJob({
    announcementId: announcement.announcement_id,
    title: announcement.title
  });
  console.log('Started job', job.id, dryRun ? '(dry-run)' : '(live SMTP)');

  const runner = runAnnouncementEmailJob(job.id, announcement);

  let lastPercent = -1;
  for (let i = 0; i < 120; i++) {
    await sleep(200);
    const snap = publicJobView(getAnnouncementEmailJob(job.id));
    if (!snap) throw new Error('job disappeared');
    if (snap.percent !== lastPercent || snap.status !== 'running') {
      console.log(
        `progress status=${snap.status} ${snap.sent}/${snap.total} failed=${snap.failed} percent=${snap.percent}`
      );
      lastPercent = snap.percent;
    }
    if (snap.status === 'completed' || snap.status === 'failed') {
      await runner;
      models.User.findAll = originalFindAll;
      if (snap.status === 'failed' && snap.sent === 0) {
        console.error('FAIL', snap.error);
        process.exitCode = 1;
        return;
      }
      console.log('OK job finished', snap);
      return;
    }
  }

  models.User.findAll = originalFindAll;
  throw new Error('Timed out waiting for job');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      const { sequelize } = require('../models');
      await sequelize.close();
    } catch (_) {
      /* ignore */
    }
  });
