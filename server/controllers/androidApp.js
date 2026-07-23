const { r2, PutObjectCommand } = require('../config/cloud');
const { SiteContent, User } = require('../models');
const { getDefault } = require('../utils/siteContentDefaults');

const CONTENT_KEY = 'android_app';
const APK_KEY = 'Mobile Application/MSP-MIU.apk';
const APK_CONTENT_TYPE = 'application/vnd.android.package-archive';

function formatFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n <= 0) return null;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `~${Math.max(1, Math.round(n / (1024 * 1024)))} MB`;
}

function buildDownloadUrl() {
  const domain = String(process.env.R2_PUBLIC_DOMAIN || '')
    .trim()
    .replace(/^=+/, '')
    .replace(/\/+$/, '');
  if (!domain) return null;
  const base = domain.startsWith('http') ? domain : `https://${domain}`;
  return `${base}/${encodeURI(APK_KEY)}`;
}

function buildPageUrl() {
  return `${(process.env.FRONTEND_URL || 'https://msp-miu.tech').replace(/\/$/, '')}/download-android`;
}

async function getStoredRelease() {
  const defaults = getDefault(CONTENT_KEY) || {};
  let row = await SiteContent.findByPk(CONTENT_KEY);
  if (!row) {
    row = await SiteContent.create({
      content_key: CONTENT_KEY,
      content_value: defaults
    });
  }
  return { ...defaults, ...(row.content_value || {}) };
}

function toPublicPayload(release) {
  const fileSizeBytes = Number(release.fileSizeBytes) || 0;
  return {
    versionName: release.versionName || '1.0.0',
    versionCode: Number(release.versionCode) || 1,
    fileSizeBytes,
    fileSizeLabel: formatFileSize(fileSizeBytes),
    releaseNotes: release.releaseNotes || '',
    apkKey: release.apkKey || APK_KEY,
    updatedAt: release.updatedAt || null,
    downloadUrl: buildDownloadUrl(),
    pageUrl: buildPageUrl()
  };
}

/**
 * Notify all users about a new Android app release.
 */
async function broadcastAndroidAppUpdateEmails(release) {
  const users = await User.findAll({ attributes: ['email'] });
  const emails = [...new Set(users.map((u) => (u.email || '').trim()).filter(Boolean))];
  if (emails.length === 0) {
    console.log('Android app update email: no recipients');
    return { sent: 0 };
  }

  const { sendEmail } = await import('../utils/email.mjs');
  const { buildAndroidAppUpdateEmail } = await import('../utils/androidAppUpdateEmail.mjs');

  const publicRelease = toPublicPayload(release);
  const { subject, text, html } = await buildAndroidAppUpdateEmail({
    versionName: publicRelease.versionName,
    releaseNotes: publicRelease.releaseNotes,
    downloadUrl: publicRelease.pageUrl || publicRelease.downloadUrl
  }, {
    frontendUrl: process.env.FRONTEND_URL
  });

  for (const to of emails) {
    await sendEmail({
      to,
      subject,
      text,
      html,
      fromName: 'MSP MIU'
    });
  }

  console.log(`Android app update emails sent to ${emails.length} recipient(s)`);
  return { sent: emails.length };
}

/**
 * GET /android-app — public release metadata
 */
const getAndroidApp = async (req, res) => {
  try {
    const release = await getStoredRelease();
    return res.json({
      success: true,
      data: toPublicPayload(release)
    });
  } catch (error) {
    console.error('Error fetching Android app info:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Android app info'
    });
  }
};

/**
 * POST /android-app/publish — replace APK, save metadata, optionally email all users
 * multipart: file (required), versionName, versionCode?, releaseNotes?, notifyUsers?
 */
const publishAndroidAppUpdate = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'APK file is required' });
    }

    const ext = (file.originalname.split('.').pop() || '').toLowerCase();
    if (ext !== 'apk') {
      return res.status(400).json({ success: false, error: 'Only .apk files are allowed' });
    }

    const versionName = String(req.body.versionName || '').trim();
    if (!versionName) {
      return res.status(400).json({ success: false, error: 'versionName is required' });
    }

    const versionCodeRaw = req.body.versionCode;
    const versionCode = versionCodeRaw === undefined || versionCodeRaw === ''
      ? undefined
      : Number(versionCodeRaw);
    if (versionCode !== undefined && (!Number.isFinite(versionCode) || versionCode < 1)) {
      return res.status(400).json({ success: false, error: 'versionCode must be a positive number' });
    }

    const releaseNotes = String(req.body.releaseNotes || '').trim();
    const notifyRaw = String(req.body.notifyUsers ?? 'true').toLowerCase();
    const notifyUsers = notifyRaw === 'true' || notifyRaw === '1' || notifyRaw === 'yes';

    const previous = await getStoredRelease();
    const nextVersionCode = versionCode ?? (Number(previous.versionCode) || 0) + 1;
    const updatedAt = new Date().toISOString();

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: APK_KEY,
        Body: file.buffer,
        ContentType: file.mimetype || APK_CONTENT_TYPE,
        ContentDisposition: 'attachment; filename="MSP-MIU.apk"'
      })
    );

    const contentValue = {
      versionName,
      versionCode: nextVersionCode,
      fileSizeBytes: file.size || 0,
      releaseNotes,
      apkKey: APK_KEY,
      updatedAt
    };

    await SiteContent.upsert({
      content_key: CONTENT_KEY,
      content_value: contentValue
    });

    let emailResult = { sent: 0, skipped: !notifyUsers };
    if (notifyUsers) {
      emailResult = await broadcastAndroidAppUpdateEmails(contentValue);
    }

    return res.json({
      success: true,
      message: notifyUsers
        ? `Android app updated and notified ${emailResult.sent} user(s)`
        : 'Android app updated (emails not sent)',
      data: toPublicPayload(contentValue),
      emails: emailResult
    });
  } catch (error) {
    console.error('Error publishing Android app update:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to publish Android app update'
    });
  }
};

/**
 * POST /android-app/notify — re-send update email to all users (no APK upload)
 */
const notifyAndroidAppUpdate = async (req, res) => {
  try {
    const release = await getStoredRelease();
    if (!release.updatedAt && !release.versionName) {
      return res.status(400).json({
        success: false,
        error: 'No Android app release has been published yet'
      });
    }

    const emailResult = await broadcastAndroidAppUpdateEmails(release);
    return res.json({
      success: true,
      message: `Update email sent to ${emailResult.sent} user(s)`,
      data: toPublicPayload(release),
      emails: emailResult
    });
  } catch (error) {
    console.error('Error notifying Android app update:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send Android app update emails'
    });
  }
};

module.exports = {
  getAndroidApp,
  publishAndroidAppUpdate,
  notifyAndroidAppUpdate,
  APK_KEY
};
