/**
 * Send the latest DB announcement using the same template as the live broadcast.
 *
 * Default: sends to all active users with role "member" (BCC batches, same as API broadcast pattern).
 *
 * Usage:
 *   node scripts/sendLatestAnnouncementTestEmail.mjs [--no-verify] [--test] [--dry-run]
 *   node scripts/sendLatestAnnouncementTestEmail.mjs --to you@example.com [--no-verify] [--test]
 *
 *   --test     [TEST] subject + yellow banner
 *   --dry-run  Only print how many members would receive mail (no SMTP)
 *   --to       Send to one address only instead of all members
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const BCC_CHUNK_SIZE = 80;

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
const { Announcement, User, sequelize } = require('../models');

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

  const { subject, text, html } = buildAnnouncementEmail(announcement, {
    testMode,
    announcementId: announcement.announcement_id,
    frontendUrl: process.env.FRONTEND_URL
  });

  const fromName = testMode ? 'MSP MIU Announcements (test)' : 'MSP MIU Announcements';

  if (singleTo) {
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

  const members = await User.findAll({
    attributes: ['email'],
    where: {
      role: 'member',
      is_active: true
    }
  });
  const emails = [...new Set(members.map((u) => (u.email || '').trim()).filter(Boolean))];

  if (emails.length === 0) {
    console.error('No active users with role "member" and a valid email.');
    process.exit(1);
  }

  if (dryRun) {
    console.log(
      `[dry-run] Latest announcement_id=${announcement.announcement_id} — would email ${emails.length} member(s).`
    );
    await sequelize.close();
    return;
  }

  const fromEmail =
    process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME || 'noreply@msp-miu.tech';

  for (let i = 0; i < emails.length; i += BCC_CHUNK_SIZE) {
    const bcc = emails.slice(i, i + BCC_CHUNK_SIZE);
    await sendEmail({
      to: fromEmail,
      bcc,
      subject,
      text,
      html,
      fromName
    });
  }

  console.log(
    `Sent ${testMode ? 'TEST' : 'production-style'} announcement email to ${emails.length} member(s) in ${Math.ceil(emails.length / BCC_CHUNK_SIZE)} batch(es) (announcement_id=${announcement.announcement_id})`
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
