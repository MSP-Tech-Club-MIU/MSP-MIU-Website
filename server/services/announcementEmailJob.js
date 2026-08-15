/**
 * In-memory announcement email broadcast jobs with progress tracking.
 * Suitable for single-instance Node deploys (e.g. one Render web service).
 */
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');
const { sendBulkEmails } = require('../utils/bulkEmailSend');

const jobs = new Map();
const JOB_TTL_MS = 60 * 60 * 1000;
const MAX_FAILURES = 500;

function pruneJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs) {
    if (job.finishedAt && job.finishedAt < cutoff) {
      jobs.delete(id);
    }
  }
}

function createAnnouncementEmailJob({ announcementId, title }) {
  pruneJobs();
  const id = randomUUID();
  const job = {
    id,
    announcementId: announcementId ?? null,
    title: title || 'Announcement',
    status: 'queued', // queued | running | completed | failed
    total: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    failures: [],
    error: null,
    createdAt: Date.now(),
    startedAt: null,
    finishedAt: null
  };
  jobs.set(id, job);
  return job;
}

function getAnnouncementEmailJob(jobId) {
  pruneJobs();
  return jobs.get(jobId) || null;
}

function publicJobView(job) {
  if (!job) return null;
  const percent = job.total > 0
    ? Math.min(100, Math.round(((job.sent + job.failed) / job.total) * 100))
    : (job.status === 'completed' || job.status === 'failed' ? 100 : 0);
  return {
    id: job.id,
    announcementId: job.announcementId,
    title: job.title,
    status: job.status,
    total: job.total,
    sent: job.sent,
    failed: job.failed,
    skipped: job.skipped || 0,
    failures: Array.isArray(job.failures) ? job.failures : [],
    percent,
    error: job.error,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt
  };
}

function pushFailure(job, email, reason) {
  if (!Array.isArray(job.failures)) job.failures = [];
  if (job.failures.length >= MAX_FAILURES) return;
  job.failures.push({
    email,
    reason: reason || 'send_failed',
    at: Date.now()
  });
}

/**
 * Load unique marketing recipients (subscribed users with email).
 */
async function loadAnnouncementRecipients() {
  const { User } = require('../models');
  const users = await User.findAll({
    attributes: ['user_id', 'email', 'email_unsubscribed_at']
  });

  const seen = new Set();
  const recipients = [];
  let skipped = 0;

  for (const u of users) {
    const email = String(u.email || '').trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (u.email_unsubscribed_at) {
      skipped += 1;
      continue;
    }
    recipients.push({ email, userId: u.user_id });
  }

  return { recipients, skipped };
}

/**
 * Run broadcast in the background; updates job progress after each send.
 * @param {string} jobId
 * @param {object} announcement — Sequelize instance or plain object
 */
async function runAnnouncementEmailJob(jobId, announcement) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = 'running';
  job.startedAt = Date.now();
  job.failures = [];

  try {
    const { recipients, skipped } = await loadAnnouncementRecipients();
    job.skipped = skipped;
    job.total = recipients.length;

    if (recipients.length === 0) {
      job.status = 'completed';
      job.finishedAt = Date.now();
      logger.info(`Announcement email job ${jobId}: no recipients (skipped=${skipped})`);
      return;
    }

    const dryRun = String(process.env.ANNOUNCEMENT_TEST_DRY_RUN || '').trim() === '1';
    let sendFn;
    let subject;
    let text;
    let html;

    if (dryRun) {
      sendFn = async ({ to }) => {
        await new Promise((r) => setTimeout(r, 40));
        logger.info(`[dry-run] announcement email → ${to}`);
        return { messageId: `dry-${Date.now()}` };
      };
      subject = announcement?.title || 'Announcement';
      text = '';
      html = '';
    } else {
      const emailMod = await import('../utils/email.mjs');
      sendFn = emailMod.sendEmail;
      const { buildAnnouncementEmail } = await import('../utils/announcementEmail.mjs');
      ({ subject, text, html } = await buildAnnouncementEmail(announcement, {
        frontendUrl: process.env.FRONTEND_URL
      }));
    }

    const result = await sendBulkEmails({
      recipients,
      sendFn,
      buildPayload: async (recipient) => ({
        to: recipient.email,
        userId: recipient.userId,
        subject,
        text,
        html,
        fromName: 'MSP MIU Announcements',
        category: 'marketing'
      }),
      onProgress: ({ sent, failed, last }) => {
        job.sent = sent;
        job.failed = failed;
        if (last && last.ok === false && last.email) {
          pushFailure(job, last.email, last.reason);
        }
      }
    });

    job.sent = result.sent;
    job.failed = result.failed;
    job.failures = (result.failures || []).map((f) => ({
      email: f.email,
      reason: f.reason,
      at: Date.now()
    }));

    job.status = job.failed > 0 && job.sent === 0 ? 'failed' : 'completed';
    if (job.status === 'failed') {
      job.error = 'All email sends failed';
    }
    job.finishedAt = Date.now();
    logger.info(
      `Announcement email job ${jobId}: done sent=${job.sent} failed=${job.failed} skipped=${job.skipped} total=${job.total}`
    );
  } catch (err) {
    job.status = 'failed';
    job.error = err.message || 'Email broadcast failed';
    job.finishedAt = Date.now();
    logger.error(`Announcement email job ${jobId} failed:`, err);
  }
}

/**
 * Create job + kick off background send (does not await completion).
 */
function startAnnouncementEmailBroadcast(announcement) {
  const plain = typeof announcement?.toJSON === 'function' ? announcement.toJSON() : announcement;
  const job = createAnnouncementEmailJob({
    announcementId: plain?.announcement_id,
    title: plain?.title
  });
  setImmediate(() => {
    runAnnouncementEmailJob(job.id, plain).catch((err) => {
      logger.error('Unhandled announcement email job error:', err);
    });
  });
  return publicJobView(job);
}

module.exports = {
  createAnnouncementEmailJob,
  getAnnouncementEmailJob,
  publicJobView,
  runAnnouncementEmailJob,
  startAnnouncementEmailBroadcast,
  loadAnnouncementRecipients
};
