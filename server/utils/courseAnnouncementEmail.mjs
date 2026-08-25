/**
 * Build course announcement email content from editable template.
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { renderTemplate, escapeHtml, formatEmailBodyHtml } = require('./emailTemplates/render');

/**
 * @param {Object} announcement - CourseAnnouncement object
 * @param {Object} course - Course object
 * @param {Object} [enrollment] - Optional CourseEnrollment object for recipient personalization
 * @param {Object} [options] - Configuration options
 * @returns {Promise<Object>} Email object with subject, text, and html
 */
export async function buildCourseAnnouncementEmail(announcement, course, enrollment = null, options = {}) {
  const frontendUrl = String(options.frontendUrl || process.env.FRONTEND_URL || process.env.WEBSITE_URL || 'https://msp-miu.tech').replace(/\/+$/, '');

  const courseTitle = course?.title || 'Course';
  const announcementTitle = announcement?.title || 'Announcement';
  const announcementMessage = announcement?.message || '';
  const studentName = enrollment?.full_name || 'Student';

  // Determine course / CTA link
  let actionUrl = '';
  let actionLabel = '';

  if (announcement.cta_url && String(announcement.cta_url).trim()) {
    actionUrl = String(announcement.cta_url).trim();
    actionLabel = announcement.cta_label && String(announcement.cta_label).trim()
      ? String(announcement.cta_label).trim()
      : 'Open Link';
  } else if (enrollment?.access_token) {
    actionUrl = `${frontendUrl}/courses/${course.course_id}/learn?token=${encodeURIComponent(enrollment.access_token)}`;
    actionLabel = 'Open Course Lessons';
  } else {
    actionUrl = `${frontendUrl}/courses/${course.course_id}`;
    actionLabel = 'View Course';
  }

  const ctaButtonHtml = actionUrl
    ? `<div style="text-align: center; margin: 18px 0 12px;">
        <a href="${escapeHtml(actionUrl)}" class="email-btn" style="display: inline-block; background: linear-gradient(135deg, #0d7bd8 0%, #03A9F4 100%); color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 5px rgba(13, 123, 216, 0.25);">${escapeHtml(actionLabel)}</a>
      </div>`
    : '';

  const ctaBlockText = actionUrl
    ? `${actionLabel}: ${actionUrl}`
    : '';

  return renderTemplate('course_announcement', {
    courseTitle,
    announcementTitle,
    announcementMessage,
    studentName,
    courseUrl: actionUrl,
    ctaLabel: actionLabel,
    ctaUrl: actionUrl,
    courseTitleHtml: escapeHtml(courseTitle),
    announcementTitleHtml: escapeHtml(announcementTitle),
    announcementMessageHtml: formatEmailBodyHtml(announcementMessage),
    studentNameHtml: escapeHtml(studentName),
    ctaButtonHtml,
    ctaBlockText
  });
}
