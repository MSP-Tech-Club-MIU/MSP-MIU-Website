/**
 * CLI: Broadcast the MSP MIU × BrainsMingle AI Summit 2026 collaboration email
 * to all unique emails across Members (all seasons), Board (all seasons), and Users.
 *
 * Usage:
 *   node server/scripts/sendBrainsMingleEmails.mjs [--dry-run] [--no-verify] [--test]
 *   node server/scripts/sendBrainsMingleEmails.mjs --to you@example.com [--test] [--no-verify] [--dry-run]
 *
 * Options:
 *   --dry-run               Print recipient breakdown & count without sending any emails
 *   --to <email>            Send to a single email address only instead of all members
 *   --test                  Prefix subject with [TEST] and include a test banner
 *   --no-verify             Skip SMTP transporter verification check before sending
 *   --include-unsubscribed  Include users who have previously unsubscribed
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
  path.join(__dirname, '.env')
];
envPaths.forEach((p, i) => {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: i > 0 });
  }
});
dotenv.config();

const require = createRequire(import.meta.url);
const { Member, Board, User, sequelize } = require('../models');
const { sendBulkEmails } = require('../utils/bulkEmailSend');
const { buildUnsubscribeUrl } = require('../utils/emailUnsubscribe');

const argv = process.argv.slice(2);
const skipVerify = argv.includes('--no-verify');
const testMode = argv.includes('--test');
const dryRun = argv.includes('--dry-run');
const includeUnsubscribed = argv.includes('--include-unsubscribed');

let singleTo = null;
const toIdx = argv.indexOf('--to');
if (toIdx !== -1) {
  const next = argv[toIdx + 1];
  if (next && !next.startsWith('--')) {
    singleTo = next.trim();
  }
  if (!singleTo || !singleTo.includes('@')) {
    console.error('❌ Usage: --to must be followed by a valid email address');
    process.exit(1);
  }
}

/**
 * Load all unique recipient emails across Members (all seasons), Board (all seasons), and Users.
 */
async function loadAllRecipients() {
  const [members, boardMembers, users] = await Promise.all([
    Member.findAll({
      attributes: ['member_id', 'full_name', 'email', 'user_id', 'season_id']
    }),
    Board.findAll({
      attributes: ['board_id', 'full_name', 'email', 'user_id', 'season_id']
    }),
    User.findAll({
      attributes: ['user_id', 'full_name', 'email', 'email_unsubscribed_at']
    })
  ]);

  const userByEmail = new Map();
  const unsubscribedEmails = new Set();

  for (const u of users) {
    const email = String(u.email || '').trim();
    if (!email || !email.includes('@')) continue;
    const key = email.toLowerCase();
    userByEmail.set(key, u);
    if (u.email_unsubscribed_at) {
      unsubscribedEmails.add(key);
    }
  }

  const seen = new Set();
  const recipients = [];
  let skippedUnsubscribed = 0;
  let fromMembers = 0;
  let fromBoard = 0;
  let fromUsers = 0;

  const tryAdd = (rawEmail, rawName, rawUserId, source) => {
    const email = String(rawEmail || '').trim();
    if (!email || !email.includes('@')) return;
    const key = email.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    if (!includeUnsubscribed && unsubscribedEmails.has(key)) {
      skippedUnsubscribed += 1;
      return;
    }

    const matchedUser = userByEmail.get(key);
    const userId = rawUserId || matchedUser?.user_id || null;
    const name = String(rawName || matchedUser?.full_name || '').trim() || null;

    if (source === 'member') fromMembers += 1;
    else if (source === 'board') fromBoard += 1;
    else if (source === 'user') fromUsers += 1;

    recipients.push({
      email,
      name,
      userId,
      source
    });
  };

  for (const m of members) {
    tryAdd(m.email, m.full_name, m.user_id, 'member');
  }
  for (const b of boardMembers) {
    tryAdd(b.email, b.full_name, b.user_id, 'board');
  }
  for (const u of users) {
    tryAdd(u.email, u.full_name, u.user_id, 'user');
  }

  return {
    recipients,
    skippedUnsubscribed,
    breakdown: {
      rawMembersCount: members.length,
      rawBoardCount: boardMembers.length,
      rawUsersCount: users.length,
      uniqueFromMembers: fromMembers,
      uniqueAddedFromBoard: fromBoard,
      uniqueAddedFromUsers: fromUsers,
      totalUniqueEligible: recipients.length
    }
  };
}

async function main() {
  const { sendEmail, verifyEmailConfig } = await import('../utils/email.mjs');
  const { buildBrainsMingleEmail } = await import('../utils/brainsMingleEmail.mjs');

  const fromName = testMode ? 'MSP MIU Announcements (test)' : 'MSP MIU Announcements';

  if (!dryRun && !skipVerify) {
    console.log('📧 Verifying SMTP email configuration...');
    const ok = await verifyEmailConfig();
    if (!ok) {
      console.error('❌ Email configuration check failed. Check MAIL_* in .env or pass --no-verify');
      process.exit(1);
    }
  }

  if (singleTo) {
    await sequelize.authenticate();
    const matchedUser = await User.findOne({
      where: { email: singleTo },
      attributes: ['user_id', 'email']
    });
    const unsubscribeUrl =
      matchedUser?.user_id && matchedUser?.email
        ? buildUnsubscribeUrl(matchedUser.user_id, matchedUser.email)
        : `${(process.env.FRONTEND_URL || 'https://msp-miu.tech').replace(/\/$/, '')}`;

    const { subject, text, html } = buildBrainsMingleEmail({
      testMode,
      unsubscribeUrl
    });

    if (dryRun) {
      console.log(`[dry-run] Would send BrainsMingle email to single recipient: ${singleTo}`);
      console.log(`[dry-run] Subject: ${subject}`);
      await sequelize.close();
      return;
    }

    await sendEmail({
      to: singleTo,
      userId: matchedUser?.user_id,
      subject,
      text,
      html,
      fromName,
      unsubscribeUrl,
      category: 'marketing'
    });

    console.log(`✅ Sent ${testMode ? 'TEST ' : ''}BrainsMingle email to ${singleTo}`);
    await sequelize.close();
    return;
  }

  await sequelize.authenticate();
  const { recipients, skippedUnsubscribed, breakdown } = await loadAllRecipients();

  console.log('\n📋 RECIPIENT BREAKDOWN');
  console.log(`   - Members records scanned: ${breakdown.rawMembersCount} (${breakdown.uniqueFromMembers} unique)`);
  console.log(`   - Board records scanned:   ${breakdown.rawBoardCount} (+${breakdown.uniqueAddedFromBoard} additional unique)`);
  console.log(`   - Users records scanned:   ${breakdown.rawUsersCount} (+${breakdown.uniqueAddedFromUsers} additional unique)`);
  console.log(`   - Skipped (unsubscribed):  ${skippedUnsubscribed}`);
  console.log(`   - Total unique recipients: ${recipients.length}\n`);

  if (dryRun) {
    const sample = buildBrainsMingleEmail({ testMode });
    console.log(`[dry-run] Subject: "${sample.subject}"`);
    console.log(`[dry-run] Would send to ${recipients.length} unique recipient(s). No emails were sent.`);
    await sequelize.close();
    return;
  }

  if (recipients.length === 0) {
    console.log('ℹ️  No eligible recipients found. Exiting.');
    await sequelize.close();
    return;
  }

  console.log(`🚀 Starting BrainsMingle collaboration email broadcast to ${recipients.length} recipient(s)...\n`);

  const defaultUnsubFallback = (process.env.FRONTEND_URL || 'https://msp-miu.tech').replace(/\/$/, '');

  const result = await sendBulkEmails({
    recipients,
    sendFn: sendEmail,
    buildPayload: async (recipient) => {
      const unsubscribeUrl = recipient.userId
        ? buildUnsubscribeUrl(recipient.userId, recipient.email)
        : defaultUnsubFallback;

      const { subject, text, html } = buildBrainsMingleEmail({
        testMode,
        unsubscribeUrl
      });

      return {
        to: recipient.email,
        userId: recipient.userId || undefined,
        subject,
        text,
        html,
        fromName,
        unsubscribeUrl: recipient.userId ? unsubscribeUrl : undefined,
        category: 'marketing',
        headers: {
          'X-Entity-Ref-ID': `brainsmingle-2026-${Date.now()}`
        }
      };
    },
    onProgress: ({ sent, failed, total, last }) => {
      if (last?.ok) {
        console.log(`   ✅ [${sent + failed}/${total}] Sent → ${last.email}`);
      } else if (last?.status === 'failed') {
        console.error(`   ❌ [${sent + failed}/${total}] Failed → ${last.email}: ${last.reason}`);
      }
    },
    onPause: ({ pauseDurationMs, batchNumber, totalBatches, sent, failed, total }) => {
      const sec = Math.round((pauseDurationMs || 0) / 1000);
      console.log(
        `\n⏳ Anti-spam throttle pause (${sec}s) before batch ${batchNumber}/${totalBatches} — progress: ${sent + failed}/${total}\n`
      );
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('📊 BRAINSMINGLE EMAIL BROADCAST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Sent:    ${result.sent}`);
  console.log(`⚠️  Skipped: ${skippedUnsubscribed + (result.skipped || 0)}`);
  console.log(`❌ Failed:  ${result.failed}`);
  console.log(`📧 Total:   ${recipients.length}`);

  if (result.failures?.length) {
    console.log('\n❌ Failed recipients:');
    result.failures.forEach((f) => console.log(`   - ${f.email}: ${f.reason}`));
  }

  await sequelize.close();
}

main().catch(async (err) => {
  console.error('❌ Fatal error:', err);
  try {
    await sequelize.close();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
