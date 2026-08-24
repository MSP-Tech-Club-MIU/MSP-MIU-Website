/**
 * In-memory email broadcast jobs with real-time progress and anti-spam pause tracking.
 * Suitable for single-instance Node deploys (e.g. Render web service).
 */
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');
const { sendBulkEmails } = require('../utils/bulkEmailSend');

const jobs = new Map();
const JOB_TTL_MS = 24 * 60 * 60 * 1000; // Keep completed jobs in memory for 24h
const MAX_FAILURES = 500;
const MAX_RECIPIENTS_LOG = 1000;

function pruneJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs) {
    if (job.finishedAt && job.finishedAt < cutoff) {
      jobs.delete(id);
    }
  }
}

function createEmailJob({
  id = null,
  type = 'announcement',
  title = 'Email broadcast',
  announcementId = null,
  total = 0,
  metadata = {}
}) {
  pruneJobs();
  const jobId = id || randomUUID();
  const job = {
    id: jobId,
    type,
    title: title || 'Email broadcast',
    announcementId: announcementId ?? null,
    status: 'queued', // queued | running | paused | completed | failed | cancelled
    total: total || 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    failures: [],
    recipients: [], // Array of { email, status: 'sent'|'failed'|'skipped', reason, at }
    error: null,
    isPaused: false,
    pausedUntil: null,
    pauseDurationMs: null,
    pauseReason: null,
    batchNumber: 1,
    totalBatches: 1,
    batchSize: 40,
    isCancelled: false,
    metadata: metadata || {},
    createdAt: Date.now(),
    startedAt: null,
    finishedAt: null
  };
  jobs.set(jobId, job);
  return job;
}

function createAnnouncementEmailJob({ announcementId, title }) {
  return createEmailJob({
    type: 'announcement',
    title: title || 'Announcement',
    announcementId: announcementId ?? null
  });
}

function getEmailJob(jobId) {
  pruneJobs();
  return jobs.get(jobId) || null;
}

function getAnnouncementEmailJob(jobId) {
  return getEmailJob(jobId);
}

function cancelEmailJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return null;
  if (job.status === 'running' || job.status === 'queued' || job.status === 'paused') {
    job.isCancelled = true;
    job.status = 'cancelled';
    job.finishedAt = Date.now();
    job.isPaused = false;
    job.pausedUntil = null;
  }
  return publicJobView(job);
}

function listAllEmailJobs({ limit = 50, status = null } = {}) {
  pruneJobs();
  const list = Array.from(jobs.values());
  list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  let filtered = list;
  if (status) {
    filtered = filtered.filter((j) => j.status === status);
  }
  return filtered.slice(0, limit).map(publicJobView);
}

function publicJobView(job) {
  if (!job) return null;
  const now = Date.now();
  const isCurrentlyPaused = Boolean(
    job.pausedUntil && job.pausedUntil > now && job.status !== 'completed' && job.status !== 'failed' && job.status !== 'cancelled'
  );
  const pauseRemainingMs = isCurrentlyPaused ? Math.max(0, job.pausedUntil - now) : 0;
  const effectiveStatus = job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled'
    ? job.status
    : isCurrentlyPaused
      ? 'paused'
      : (job.status || 'queued');

  const processed = (job.sent || 0) + (job.failed || 0);
  const percent = job.total > 0
    ? Math.min(100, Math.round((processed / job.total) * 100))
    : (job.status === 'completed' || job.status === 'failed' ? 100 : 0);

  return {
    id: job.id,
    type: job.type || 'announcement',
    announcementId: job.announcementId,
    title: job.title,
    status: effectiveStatus,
    total: job.total,
    sent: job.sent,
    failed: job.failed,
    skipped: job.skipped || 0,
    percent,
    failures: Array.isArray(job.failures) ? job.failures : [],
    recipients: Array.isArray(job.recipients) ? job.recipients : [],
    error: job.error,
    isPaused: isCurrentlyPaused,
    pausedUntil: job.pausedUntil,
    pauseDurationMs: job.pauseDurationMs,
    pauseRemainingMs,
    pauseReason: job.pauseReason || (isCurrentlyPaused ? 'spam_prevention' : null),
    batchNumber: job.batchNumber || 1,
    totalBatches: job.totalBatches || 1,
    batchSize: job.batchSize || 40,
    metadata: job.metadata || {},
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt
  };
}

function pushRecipientEvent(job, email, status, reason = null) {
  if (!Array.isArray(job.recipients)) job.recipients = [];
  if (job.recipients.length >= MAX_RECIPIENTS_LOG) {
    job.recipients.shift();
  }
  job.recipients.push({
    email: String(email || '').trim(),
    status, // 'sent' | 'failed' | 'skipped'
    reason: reason || null,
    at: Date.now()
  });

  if (status === 'failed') {
    if (!Array.isArray(job.failures)) job.failures = [];
    if (job.failures.length < MAX_FAILURES) {
      job.failures.push({
        email: String(email || '').trim(),
        reason: reason || 'send_failed',
        at: Date.now()
      });
    }
  }
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
  job.recipients = [];

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
        if (last && last.email) {
          pushRecipientEvent(job, last.email, last.status || (last.ok ? 'sent' : 'failed'), last.reason);
        }
      },
      onPause: ({ pauseUntil, pauseDurationMs, batchNumber, totalBatches, batchSize }) => {
        job.isPaused = true;
        job.pausedUntil = pauseUntil;
        job.pauseDurationMs = pauseDurationMs;
        job.pauseReason = 'spam_prevention';
        job.batchNumber = batchNumber;
        job.totalBatches = totalBatches;
        job.batchSize = batchSize;
        job.status = 'paused';
        logger.info(
          `Announcement email job ${jobId}: anti-spam throttle pause until ${new Date(pauseUntil).toISOString()} (Batch ${batchNumber}/${totalBatches})`
        );
      },
      onResume: ({ batchNumber, totalBatches }) => {
        job.isPaused = false;
        job.pausedUntil = null;
        job.status = 'running';
        job.batchNumber = batchNumber;
        job.totalBatches = totalBatches;
        logger.info(`Announcement email job ${jobId}: resumed sending (Batch ${batchNumber}/${totalBatches})`);
      },
      isCancelled: () => job.isCancelled
    });

    job.isPaused = false;
    job.pausedUntil = null;
    job.sent = result.sent;
    job.failed = result.failed;
    job.failures = (result.failures || []).map((f) => ({
      email: f.email,
      reason: f.reason,
      at: Date.now()
    }));

    if (job.isCancelled) {
      job.status = 'cancelled';
    } else {
      job.status = job.failed > 0 && job.sent === 0 ? 'failed' : 'completed';
      if (job.status === 'failed') {
        job.error = 'All email sends failed';
      }
    }
    job.finishedAt = Date.now();
    logger.info(
      `Announcement email job ${jobId}: done sent=${job.sent} failed=${job.failed} skipped=${job.skipped} total=${job.total}`
    );
  } catch (err) {
    job.isPaused = false;
    job.pausedUntil = null;
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
  createEmailJob,
  createAnnouncementEmailJob,
  getEmailJob,
  getAnnouncementEmailJob,
  cancelEmailJob,
  listAllEmailJobs,
  publicJobView,
  runAnnouncementEmailJob,
  startAnnouncementEmailBroadcast,
  loadAnnouncementRecipients,
  pushRecipientEvent
};
