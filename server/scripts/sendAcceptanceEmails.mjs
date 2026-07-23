/**
 * CLI: send member acceptance emails (uses department WhatsApp URLs + DB templates).
 */
import dotenv from 'dotenv';
import { createRequire } from 'module';
import { verifyEmailConfig } from '../utils/email.mjs';

const require = createRequire(import.meta.url);
const sequelize = require('../config/db');
require('../models/index');
const { sendAcceptanceEmailsToMembers } = require('../utils/acceptanceEmail');

dotenv.config();

async function main() {
  console.log('🚀 Starting acceptance email sending...\n');
  const ok = await verifyEmailConfig();
  if (!ok) {
    console.error('❌ Email configuration verification failed.');
    process.exit(1);
  }
  await sequelize.authenticate();
  const summary = await sendAcceptanceEmailsToMembers({ delayMs: 1000 });
  console.log('\n📊 SUMMARY');
  console.log(`✅ Sent: ${summary.sent}`);
  console.log(`⚠️  Skipped: ${summary.skipped}`);
  console.log(`❌ Failed: ${summary.failed}`);
  if (summary.skippedMembers.length) {
    console.log('\nSkipped:');
    summary.skippedMembers.forEach((s) => console.log(`   - ${s.name}: ${s.reason}`));
  }
  if (summary.errors.length) {
    summary.errors.forEach((e) => console.log(`   - ${e.name}: ${e.error}`));
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
