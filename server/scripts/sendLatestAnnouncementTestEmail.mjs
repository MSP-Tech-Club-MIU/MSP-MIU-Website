/**
 * Send the latest DB announcement using the exact same broadcast logic as the live app.
 *
 * Default: sends the latest inserted announcement to all users using the same
 * `broadcastNewAnnouncementEmails()` helper used when announcements are created.
 *
 * Usage:
 *   node scripts/sendLatestAnnouncementTestEmail.mjs [--no-verify] [--test] [--dry-run]
 *   node scripts/sendLatestAnnouncementTestEmail.mjs --to you@example.com [--no-verify] [--test]
 *
 *   --test     [TEST] subject + yellow banner
 *   --dry-run  Only print how many users would receive mail (no SMTP)
 *   --to       Send to one address only instead of all users
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../.env'),
  path.join(__dirname, '.env'),
];
envPaths.forEach((p, i) => {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: i > 0 });
  }
});
dotenv.config();

const require = createRequire(import.meta.url);
const { Announcement, sequelize } = require('../models');
const { broadcastNewAnnouncementEmails } = require('../controllers/announcements');

const argv = process.argv.slice(2);
const skipVerify = argv.includes('--no-verify');
const testMode = argv.includes('--test');
const dryRun = argv.includes('--dry-run');

let singleTo = null;
const toIdx = argv.indexOf('--to');
if (toIdx !== -1) {
  const next = argv[toIdx + 1];
  if (next && !next.startsWith('--')) {
    singleTo = next.trim();
  }
  if (!singleTo || !singleTo.includes('@')) {
    console.error('Usage: --to must be followed by a valid email address');
    process.exit(1);
  }
}

async function main() {
  const { sendEmail, verifyEmailConfig } = await import('../utils/email.mjs');
  const { buildAnnouncementEmail } = await import('../utils/announcementEmail.mjs');

  if (!dryRun && !skipVerify) {
    const ok = await verifyEmailConfig();
    if (!ok) {
      console.error('Email configuration check failed. Set MAIL_* in .env or retry with --no-verify');
      process.exit(1);
    }
  }

  const announcement = await Announcement.findOne({
    order: [['announcement_id', 'DESC']]
  });

  if (!announcement) {
    console.error('No announcements found in the database.');
    process.exit(1);
  }

  if (singleTo) {
    const { subject, text, html } = await buildAnnouncementEmail(announcement, {
      testMode,
      announcementId: announcement.announcement_id,
      frontendUrl: process.env.FRONTEND_URL
    });
    const fromName = testMode ? 'MSP MIU Announcements (test)' : 'MSP MIU Announcements';
    if (dryRun) {
      console.log(`[dry-run] Would send to single address: ${singleTo}`);
      await sequelize.close();
      return;
    }
    await sendEmail({
      to: singleTo,
      subject,
      text,
      html,
      fromName
    });
    console.log(
      `Sent ${testMode ? 'TEST' : 'production-style'} email to ${singleTo} (announcement_id=${announcement.announcement_id})`
    );
    await sequelize.close();
    return;
  }

  if (dryRun) {
    const users = await require('../models').User.findAll({ attributes: ['email'] });
    const emails = [...new Set(users.map((u) => (u.email || '').trim()).filter(Boolean))];
    console.log(`[dry-run] Latest announcement_id=${announcement.announcement_id} — would email ${emails.length} user(s).`);
    await sequelize.close();
    return;
  }
 
  await broadcastNewAnnouncementEmails(announcement);

  console.log(
    `Sent latest announcement using live broadcast logic (announcement_id=${announcement.announcement_id})`
  );
  await sequelize.close();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await sequelize.close();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
