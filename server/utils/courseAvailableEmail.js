const { renderTemplate } = require('./emailTemplates/render');
const logger = require('./logger');

function frontendBaseUrl() {
  return String(process.env.WEBSITE_URL || process.env.FRONTEND_URL || 'https://msp-miu.tech').replace(/\/+$/, '');
}

/**
 * Send "course is available" email to one enrollment.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendCourseAvailableEmail(enrollment, course, sendEmail, userId) {
  const courseUrl = `${frontendBaseUrl()}/courses/${course.course_id}/learn?token=${encodeURIComponent(enrollment.access_token)}`;
  const rendered = await renderTemplate('course_available', {
    studentName: enrollment.full_name || 'there',
    courseTitle: course.title || 'Course',
    courseUrl
  });

  if (!rendered) {
    throw new Error('course_available email template missing');
  }

  await sendEmail({
    to: enrollment.email,
    userId,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    category: 'marketing'
  });

  return { success: true };
}

/**
 * Notify all enrollments that have not been notified yet for a published course.
 * Skips users who opted out of marketing email.
 */
async function notifyCourseEnrollments(course, enrollments) {
  const { sendEmail } = await import('./email.mjs');
  const { User } = require('../models');
  const { Op } = require('sequelize');
  const results = { sent: 0, failed: 0, skipped: 0, errors: [] };

  const emails = [
    ...new Set(
      enrollments
        .map((e) => String(e.email || '').trim().toLowerCase())
        .filter(Boolean)
    )
  ];
  const users = emails.length
    ? await User.findAll({
        where: { email: { [Op.in]: emails } },
        attributes: ['user_id', 'email', 'email_unsubscribed_at']
      })
    : [];
  const byEmail = new Map(
    users.map((u) => [String(u.email || '').trim().toLowerCase(), u])
  );

  for (const enrollment of enrollments) {
    if (!enrollment.email) continue;
    const key = String(enrollment.email).trim().toLowerCase();
    const user = byEmail.get(key);
    if (user?.email_unsubscribed_at) {
      results.skipped += 1;
      continue;
    }
    try {
      await sendCourseAvailableEmail(enrollment, course, sendEmail, user?.user_id);
      results.sent += 1;
    } catch (err) {
      results.failed += 1;
      results.errors.push({ enrollment_id: enrollment.enrollment_id, error: err.message });
      logger.error(`course_available email failed for enrollment ${enrollment.enrollment_id}:`, { message: err.message });
    }
  }

  return results;
}

module.exports = {
  frontendBaseUrl,
  sendCourseAvailableEmail,
  notifyCourseEnrollments
};
