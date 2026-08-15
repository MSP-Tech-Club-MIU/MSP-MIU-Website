/**
 * Paced bulk email sender to reduce SMTP rate / spam-filter risk.
 */
const logger = require('./logger');

const DEFAULT_DELAY_MS = 800;
const DEFAULT_BATCH_SIZE = 40;
const DEFAULT_BATCH_PAUSE_MS = 15000;
const MAX_FAILURES = 500;

function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function sleep(ms) {
  if (!ms || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {object} options
 * @param {Array<{ email: string, userId?: number }>} options.recipients
 * @param {(recipient: { email: string, userId?: number }) => Promise<object>} options.buildPayload
 * @param {(mailOptions: object) => Promise<unknown>} options.sendFn
 * @param {number} [options.delayMs]
 * @param {number} [options.batchSize]
 * @param {number} [options.batchPauseMs]
 * @param {(progress: { sent: number, failed: number, skipped: number, total: number, last?: object }) => void} [options.onProgress]
 * @param {(recipient: { email: string, userId?: number }) => boolean|Promise<boolean>} [options.shouldSkip]
 * @returns {Promise<{ sent: number, failed: number, skipped: number, failures: Array<{ email: string, reason: string }> }>}
 */
async function sendBulkEmails({
  recipients,
  buildPayload,
  sendFn,
  delayMs = envInt('MAIL_BULK_DELAY_MS', DEFAULT_DELAY_MS),
  batchSize = envInt('MAIL_BULK_BATCH_SIZE', DEFAULT_BATCH_SIZE),
  batchPauseMs = envInt('MAIL_BULK_BATCH_PAUSE_MS', DEFAULT_BATCH_PAUSE_MS),
  onProgress,
  shouldSkip
}) {
  const list = Array.isArray(recipients) ? recipients : [];
  const total = list.length;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const failures = [];
  let processedInBatch = 0;

  const report = (last) => {
    if (typeof onProgress === 'function') {
      onProgress({ sent, failed, skipped, total, last });
    }
  };

  for (let i = 0; i < list.length; i += 1) {
    const recipient = list[i];
    const email = String(recipient?.email || '').trim();
    if (!email) {
      skipped += 1;
      report({ email: '', reason: 'missing_email' });
      continue;
    }

    try {
      if (shouldSkip && (await shouldSkip(recipient))) {
        skipped += 1;
        report({ email, reason: 'skipped' });
        continue;
      }

      const payload = await buildPayload(recipient);
      await sendFn(payload);
      sent += 1;
      report({ email, ok: true });
    } catch (err) {
      failed += 1;
      const reason = err?.message || String(err) || 'send_failed';
      if (failures.length < MAX_FAILURES) {
        failures.push({ email, reason });
      }
      logger.error(`Bulk email failed for ${email}:`, err);
      report({ email, reason, ok: false });
    }

    processedInBatch += 1;
    const isLast = i === list.length - 1;
    if (!isLast) {
      if (batchSize > 0 && processedInBatch >= batchSize) {
        processedInBatch = 0;
        await sleep(batchPauseMs);
      } else {
        await sleep(delayMs);
      }
    }
  }

  return { sent, failed, skipped, failures };
}

module.exports = {
  sendBulkEmails,
  DEFAULT_DELAY_MS,
  DEFAULT_BATCH_SIZE,
  DEFAULT_BATCH_PAUSE_MS,
  MAX_FAILURES
};
