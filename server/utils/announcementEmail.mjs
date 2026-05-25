/**
 * Shared HTML + plain text for announcement broadcast emails.
 * Visual style aligned with Back-End client (styles.css, FeedSection, Navbar): navy shell,
 * card #0e2744, accents #8EC2F0 / #03A9F4, Inter-style stack.
 */
const FONT_STACK =
  "Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Site palette (from client/src/assets/CSS/styles.css & FeedSection.css) */
const C = {
  navy900: '#091a2c',
  navBar: '#031c35',
  card: '#0e2744',
  cardBorderHex: '#1e3a52',
  ice: '#8EC2F0',
  iceMuted: '#5AA0E6',
  cyan: '#03A9F4',
  text: '#eaf2ff',
  gray: '#8a8a8a',
  white08: 'rgba(255,255,255,0.08)',
};

/**
 * @param {object} announcement — Sequelize instance or plain { title, description, ... }
 * @param {object} [options]
 * @param {boolean} [options.testMode=false]
 * @param {number} [options.announcementId]
 * @param {string} [options.frontendUrl]
 */
export function buildAnnouncementEmail(announcement, options = {}) {
  const { testMode = false, announcementId, frontendUrl: urlOpt } = options;
  const frontendUrl = (urlOpt || process.env.FRONTEND_URL || 'https://msp-miu.tech').replace(/\/$/, '');

  const title = announcement.title;
  const description = announcement.description;

  const subjectCore = safeEmailSubject(title);
  const subject = testMode ? `[TEST] ${subjectCore}` : subjectCore;

  const text = testMode
    ? [
        '[TEST — not sent to all users]',
        '',
        title,
        '',
        description,
        '',
        `—`,
        frontendUrl
      ].join('\n')
    : [title, '', description, '', `—`, `MSP MIU · ${frontendUrl}`].join('\n');

  const hTitle = escapeHtml(title);
  const hDesc = escapeHtml(description).replace(/\n/g, '<br/>');

  const preheader = escapeHtml(plainPreview(description, 140) || title);

  const testBanner =
    testMode && announcementId != null
      ? `<tr>
  <td style="padding:16px 26px 0;font-family:${FONT_STACK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,191,0,0.12);border:1px solid rgba(255,191,0,0.45);border-radius:12px;">
      <tr><td style="padding:12px 16px;font-size:13px;color:#ffd666;line-height:1.5;">
        <strong>Test email</strong> · announcement_id=${escapeHtml(String(announcementId))}
      </td></tr>
    </table>
  </td>
</tr>`
      : testMode
        ? `<tr>
  <td style="padding:16px 26px 0;font-family:${FONT_STACK};">
    <p style="margin:0;padding:12px 16px;background:rgba(255,191,0,0.12);border:1px solid rgba(255,191,0,0.45);border-radius:12px;font-size:13px;color:#ffd666;"><strong>Test email</strong></p>
  </td>
</tr>`
        : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark light">
  <meta name="supported-color-schemes" content="dark light">
  <title>${hTitle}</title>
</head>
<body style="margin:0;padding:0;background:${C.navy900};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${C.navy900};opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.navy900};">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${C.card};border:1px solid ${C.cardBorderHex};border-radius:18px;overflow:hidden;">
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background:${C.cyan};">&nbsp;</td>
          </tr>
          <tr>
            <td style="background:${C.navBar};padding:20px 26px 18px;border-bottom:1px solid ${C.white08};">
              <p style="margin:0;font-family:${FONT_STACK};font-size:20px;font-weight:700;letter-spacing:0.5px;line-height:1.2;">
                <span style="color:${C.ice};">MSP</span><span style="color:${C.text};"> · MIU</span>
              </p>
              <p style="margin:8px 0 0;font-family:${FONT_STACK};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${C.iceMuted};font-weight:600;">Announcement</p>
            </td>
          </tr>
          ${testBanner}
          <tr>
            <td style="padding:22px 26px 8px;font-family:${FONT_STACK};">
              <h1 style="margin:0;font-size:19px;font-weight:600;letter-spacing:0.4px;color:#ffffff;line-height:1.35;">${hTitle}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 26px 26px;font-family:${FONT_STACK};font-size:14px;line-height:1.55;color:${C.ice};">
              ${hDesc}
            </td>
          </tr>
          <tr>
            <td style="padding:0 26px 28px;font-family:${FONT_STACK};" align="center">
              <a href="${escapeHtml(frontendUrl)}" style="display:inline-block;padding:12px 26px;background:${C.cyan};color:#ffffff;text-decoration:none;border-radius:12px;font-weight:600;font-size:13px;letter-spacing:0.35px;box-shadow:0 4px 12px rgba(3,169,244,0.28);">Visit MSP MIU</a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 26px 24px;border-top:1px solid ${C.white08};font-family:${FONT_STACK};font-size:12px;line-height:1.55;color:${C.gray};text-align:center;">
              <p style="margin:0 0 10px;">
                <a href="${escapeHtml(frontendUrl)}" style="color:${C.cyan};text-decoration:none;font-weight:600;">${escapeHtml(frontendUrl)}</a>
              </p>
              <p style="margin:0;color:${C.gray};">You receive these messages because you have an account with MSP MIU.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

function plainPreview(text, maxLen) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 1)}…`;
}

function escapeHtml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeEmailSubject(t) {
  return String(t || 'Announcement').replace(/[\r\n\x00-\x1f]+/g, ' ').trim().slice(0, 200);
}
