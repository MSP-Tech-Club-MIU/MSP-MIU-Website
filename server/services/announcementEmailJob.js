/**
 * In-memory announcement email broadcast jobs with progress tracking.
 * Suitable for single-instance Node deploys (e.g. one Render web service).
 */
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

const jobs = new Map();
const JOB_TTL_MS = 60 * 60 * 1000;

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
    percent,
    error: job.error,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt
  };
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

  try {
    const { User } = require('../models');
    const users = await User.findAll({ attributes: ['email'] });
    const emails = [...new Set(users.map((u) => (u.email || '').trim()).filter(Boolean))];
    job.total = emails.length;

    if (emails.length === 0) {
      job.status = 'completed';
      job.finishedAt = Date.now();
      logger.info(`Announcement email job ${jobId}: no recipients`);
      return;
    }

    const dryRun = String(process.env.ANNOUNCEMENT_TEST_DRY_RUN || '').trim() === '1';
    let sendEmail;
    let subject;
    let text;
    let html;

    if (dryRun) {
      sendEmail = async ({ to }) => {
        await new Promise((r) => setTimeout(r, 80));
        logger.info(`[dry-run] announcement email → ${to}`);
        return { messageId: `dry-${Date.now()}` };
      };
      subject = announcement?.title || 'Announcement';
      text = '';
      html = '';
    } else {
      ({ sendEmail } = await import('../utils/email.mjs'));
      const { buildAnnouncementEmail } = await import('../utils/announcementEmail.mjs');
      ({ subject, text, html } = await buildAnnouncementEmail(announcement, {
        frontendUrl: process.env.FRONTEND_URL
      }));
    }

    for (const to of emails) {
      try {
        await sendEmail({
          to,
          subject,
          text,
          html,
          fromName: 'MSP MIU Announcements'
        });
        job.sent += 1;
      } catch (err) {
        job.failed += 1;
        logger.error(`Announcement email job ${jobId}: failed for ${to}:`, err);
      }
    }

    job.status = job.failed > 0 && job.sent === 0 ? 'failed' : 'completed';
    if (job.status === 'failed') {
      job.error = 'All email sends failed';
    }
    job.finishedAt = Date.now();
    logger.info(
      `Announcement email job ${jobId}: done sent=${job.sent} failed=${job.failed} total=${job.total}`
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
  startAnnouncementEmailBroadcast
};
