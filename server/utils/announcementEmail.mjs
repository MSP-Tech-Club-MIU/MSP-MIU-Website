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

  const titleHtml = escapeHtml(title);
  const descriptionHtml = escapeHtml(description).replace(/\n/g, '<br/>');
  const preheader = escapeHtml(plainPreview(description, 140) || title);

  let testBannerHtml = '';
  if (testMode && announcementId != null) {
    testBannerHtml = `<tr>
  <td style="padding:16px 26px 0;font-family:Inter,system-ui,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,191,0,0.12);border:1px solid rgba(255,191,0,0.45);border-radius:12px;">
      <tr><td style="padding:12px 16px;font-size:13px;color:#ffd666;line-height:1.5;">
        <strong>Test email</strong> · announcement_id=${escapeHtml(String(announcementId))}
      </td></tr>
    </table>
  </td>
</tr>`;
  } else if (testMode) {
    testBannerHtml = `<tr>
  <td style="padding:16px 26px 0;font-family:Inter,system-ui,sans-serif;">
    <p style="margin:0;padding:12px 16px;background:rgba(255,191,0,0.12);border:1px solid rgba(255,191,0,0.45);border-radius:12px;font-size:13px;color:#ffd666;"><strong>Test email</strong></p>
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
    testBannerHtml
  });

  const subject = testMode ? `[TEST] ${rendered.subject}` : rendered.subject;
  const text = testMode
    ? ['[TEST — not sent to all users]', '', rendered.text].join('\n')
    : rendered.text;

  return { subject, text, html: rendered.html };
}

function plainPreview(text, maxLen) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 1)}…`;
}

function safeEmailSubject(t) {
  return String(t || 'Announcement').replace(/[\r\n\x00-\x1f]+/g, ' ').trim().slice(0, 200);
}
