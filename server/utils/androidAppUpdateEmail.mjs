/**
 * Email payload for Android app update broadcasts.
 * Editable via email_templates (android_app_update).
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { renderTemplate, escapeHtml } = require('./emailTemplates/render');

/**
 * @param {object} release — { versionName, releaseNotes, downloadUrl }
 * @param {object} [options]
 * @param {string} [options.frontendUrl]
 */
export async function buildAndroidAppUpdateEmail(release, options = {}) {
  const frontendUrl = (options.frontendUrl || process.env.FRONTEND_URL || 'https://msp-miu.tech').replace(/\/$/, '');
  const versionName = release.versionName || 'new';
  const releaseNotes = release.releaseNotes || '';
  const downloadUrl = release.downloadUrl || `${frontendUrl}/download-android`;

  const title = `Android app update ${versionName}`;
  const titleHtml = escapeHtml(title);
  const notesHtml = releaseNotes
    ? escapeHtml(releaseNotes).replace(/\n/g, '<br/>')
    : 'A new version of the MSP MIU Android app is available. Please update to get the latest features and fixes.';
  const preheader = escapeHtml(
    releaseNotes
      ? plainPreview(releaseNotes, 140)
      : `MSP MIU Android app ${versionName} is ready to download.`
  );

  const rendered = await renderTemplate('android_app_update', {
    title,
    versionName,
    releaseNotes: releaseNotes || 'A new version of the MSP MIU Android app is available.',
    downloadUrl,
    frontendUrl,
    titleHtml,
    versionNameHtml: escapeHtml(versionName),
    notesHtml,
    preheader
  });

  return {
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html
  };
}

function plainPreview(text, maxLen) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 1)}…`;
}
