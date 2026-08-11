const { renderTemplate } = require('./emailTemplates/render');

function frontendBaseUrl() {
  return String(process.env.WEBSITE_URL || process.env.FRONTEND_URL || 'https://msp-miu.tech').replace(/\/+$/, '');
}

/**
 * Send "course is available" email to one enrollment.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendCourseAvailableEmail(enrollment, course, sendEmail) {
  const courseUrl = `${frontendBaseUrl()}/courses/${course.course_id}?token=${encodeURIComponent(enrollment.access_token)}`;
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
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html
  });

  return { success: true };
}

/**
 * Notify all enrollments that have not been notified yet for a published course.
 */
async function notifyCourseEnrollments(course, enrollments) {
  const { sendEmail } = await import('./email.mjs');
  const results = { sent: 0, failed: 0, errors: [] };

  for (const enrollment of enrollments) {
    if (!enrollment.email) continue;
    try {
      await sendCourseAvailableEmail(enrollment, course, sendEmail);
      results.sent += 1;
    } catch (err) {
      results.failed += 1;
      results.errors.push({ enrollment_id: enrollment.enrollment_id, error: err.message });
      console.error(`course_available email failed for enrollment ${enrollment.enrollment_id}:`, err.message);
    }
  }

  return results;
}

module.exports = {
  frontendBaseUrl,
  sendCourseAvailableEmail,
  notifyCourseEnrollments
};
