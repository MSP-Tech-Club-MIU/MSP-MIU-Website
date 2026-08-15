/**
 * Shared HTML + plain text for announcement broadcast emails.
 * Content shells are editable via email_templates (site_announcement).
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { renderTemplate, escapeHtml } = require('./emailTemplates/render');

/**
 * @param {object} announcement — Sequelize instance or plain { title, description, ... }
 * @param {object} [options]
 * @param {boolean} [options.testMode=false]
 * @param {number} [options.announcementId]
 * @param {string} [options.frontendUrl]
 */
export async function buildAnnouncementEmail(announcement, options = {}) {
  const { testMode = false, announcementId, frontendUrl: urlOpt } = options;
  const frontendUrl = (urlOpt || process.env.FRONTEND_URL || 'https://msp-miu.tech').replace(/\/$/, '');

  const title = announcement.title || 'Announcement';
  const description = announcement.description || '';
  const department = (announcement.department || '').trim();
  const rawDate = announcement.announcement_date || '';

  const titleHtml = escapeHtml(title);
  const descriptionHtml = escapeHtml(description).replace(/\n/g, '<br/>');
  const preheader = escapeHtml(plainPreview(description, 140) || title);

  const dateLabel = formatAnnouncementDate(rawDate);
  const metaParts = [];
  if (department) {
    metaParts.push(
      `<span style="display:inline-block;padding:4px 10px;background:#eaf2ff;color:#0d7bd8;border-radius:999px;font-size:12px;font-weight:600;">${escapeHtml(department)}</span>`
    );
  }
  if (dateLabel) {
    metaParts.push(
      `<span style="display:inline-block;font-size:13px;color:#666666;">${escapeHtml(dateLabel)}</span>`
    );
  }
  const metaHtml = metaParts.length
    ? `<p style="margin:14px 0 0;display:flex;flex-wrap:wrap;gap:10px;align-items:center;">${metaParts.join('')}</p>`
    : '';

  const departmentLine = department ? `Department: ${department}\n` : '';
  const dateLine = dateLabel ? `Date: ${dateLabel}\n\n` : department ? '\n' : '';

  const ctaLabel = String(announcement.cta_label || '').trim() || 'View on MSP MIU';
  const ctaUrl = String(announcement.cta_url || '').trim() || frontendUrl;
  const ctaHtml = `<a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0d7bd8 0%,#03A9F4 100%);color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 4px 8px rgba(13,123,216,0.3);">${escapeHtml(ctaLabel)}</a>`;
  const ctaText = `${ctaLabel}: ${ctaUrl}`;

  let testBannerHtml = '';
  if (testMode && announcementId != null) {
    testBannerHtml = `<tr>
  <td style="padding:16px 36px 0;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e6;border:1px solid #f0d58a;border-radius:6px;">
      <tr><td style="padding:12px 16px;font-size:13px;color:#8a6d1d;line-height:1.5;">
        <strong>Test email</strong> · announcement_id=${escapeHtml(String(announcementId))}
      </td></tr>
    </table>
  </td>
</tr>`;
  } else if (testMode) {
    testBannerHtml = `<tr>
  <td style="padding:16px 36px 0;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    <p style="margin:0;padding:12px 16px;background:#fff8e6;border:1px solid #f0d58a;border-radius:6px;font-size:13px;color:#8a6d1d;"><strong>Test email</strong></p>
  </td>
</tr>`;
  }

  const rendered = await renderTemplate('site_announcement', {
    title: safeEmailSubject(title),
    description,
    frontendUrl,
    titleHtml,
    descriptionHtml,
    preheader,
    testBannerHtml,
    metaHtml,
    departmentLine,
    dateLine,
    ctaHtml,
    ctaText
  });

  const subject = testMode ? `[TEST] ${rendered.subject}` : rendered.subject;
  const text = testMode
    ? ['[TEST — not sent to all users]', '', rendered.text].join('\n')
    : rendered.text;

  return { subject, text, html: rendered.html };
}

function formatAnnouncementDate(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    return String(value);
  }
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function plainPreview(text, maxLen) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 1)}…`;
}

function safeEmailSubject(t) {
  return String(t || 'Announcement').replace(/[\r\n\x00-\x1f]+/g, ' ').trim().slice(0, 200);
}
