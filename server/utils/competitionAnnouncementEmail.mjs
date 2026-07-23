/**
 * Build competition announcement email content from editable template.
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { renderTemplate, escapeHtml } = require('./emailTemplates/render');

/**
 * @param {Object} announcement - CompetitionAnnouncement object
 * @param {Object} competition - Competition object
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Email object with subject, text, and html
 */
export async function buildCompetitionAnnouncementEmail(announcement, competition, options = {}) {
  const { frontendUrl = 'https://msp-miu.com' } = options;
  const competitionLink = `${frontendUrl}/competitions/${announcement.competition_id}`;

  const competitionTitle = competition.title || '';
  const announcementTitle = announcement.title || '';
  const announcementMessage = announcement.message || '';

  return renderTemplate('competition_announcement', {
    competitionTitle,
    announcementTitle,
    announcementMessage,
    competitionLink,
    competitionTitleHtml: escapeHtml(competitionTitle),
    announcementTitleHtml: escapeHtml(announcementTitle),
    announcementMessageHtml: escapeHtml(announcementMessage)
  });
}
