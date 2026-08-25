/**
 * CLI: send member activation emails (uses shared util + DB templates).
 */
import dotenv from 'dotenv';
import { createRequire } from 'module';
import { verifyEmailConfig } from '../utils/email.mjs';

const require = createRequire(import.meta.url);
const sequelize = require('../config/db');
require('../models/index');
const { sendActivationEmailsToMembers } = require('../utils/activationEmail');

dotenv.config();

async function main() {
  console.log('🚀 Starting member activation email sending...\n');
  const ok = await verifyEmailConfig();
  if (!ok) {
    console.error('❌ Email configuration verification failed.');
    process.exit(1);
  }
  await sequelize.authenticate();
  const summary = await sendActivationEmailsToMembers({ delayMs: 1000 });
  console.log('\n📊 SUMMARY');
  console.log(`✅ Sent: ${summary.sent}`);
  console.log(`⚠️  Skipped: ${summary.skipped}`);
  console.log(`❌ Failed: ${summary.failed}`);
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
