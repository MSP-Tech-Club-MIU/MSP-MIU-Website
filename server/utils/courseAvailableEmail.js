const { renderTemplate } = require('./emailTemplates/render');
const logger = require('./logger');

function frontendBaseUrl() {
  return String(process.env.WEBSITE_URL || process.env.FRONTEND_URL || 'https://msp-miu.tech').replace(/\/+$/, '');
}

/**
 * Checks whether the first session (lesson) of a course has video content uploaded.
 * Video content includes YouTube materials with a valid URL or video files (.mp4, .webm, etc.).
 * @param {number|string} courseId
 * @returns {Promise<{ hasFirstSession: boolean, hasVideo: boolean, firstLesson: object|null, videoMaterial: object|null }>}
 */
async function checkFirstSessionHasVideo(courseId) {
  const { CourseLesson, CourseLessonMaterial } = require('../models');

  let lessons = await CourseLesson.findAll({
    where: { course_id: courseId, is_published: true },
    order: [['sort_order', 'ASC'], ['lesson_id', 'ASC']]
  });
  if (!lessons.length) {
    lessons = await CourseLesson.findAll({
      where: { course_id: courseId },
      order: [['sort_order', 'ASC'], ['lesson_id', 'ASC']]
    });
  }

  if (!lessons.length) {
    return {
      hasFirstSession: false,
      hasVideo: false,
      firstLesson: null,
      videoMaterial: null
    };
  }

  const firstLesson = lessons[0];
  const materials = await CourseLessonMaterial.findAll({
    where: { lesson_id: firstLesson.lesson_id },
    order: [['sort_order', 'ASC'], ['material_id', 'ASC']]
  });

  const videoMaterial = materials.find((m) => {
    if (m.material_type === 'youtube' && m.youtube_url && String(m.youtube_url).trim()) {
      return true;
    }
    if (m.file_url && /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(m.file_url || m.file_name || '')) {
      return true;
    }
    return false;
  });

  return {
    hasFirstSession: true,
    hasVideo: Boolean(videoMaterial),
    firstLesson,
    videoMaterial: videoMaterial || null
  };
}

/**
 * Send "course is available" email to one enrollment.
 * Automatically chooses live attendance vs recordings template based on enrollment.attendance_type.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendCourseAvailableEmail(enrollment, course, sendEmail, userId) {
  const courseUrl = `${frontendBaseUrl()}/courses/${course.course_id}/learn?token=${encodeURIComponent(enrollment.access_token)}`;
  const isRecordings = enrollment.attendance_type === 'recordings_only';
  const attendanceTypeLabel = isRecordings ? 'Recordings Only' : 'Live Attendance';
  const targetTemplateKey = isRecordings ? 'course_available_recordings' : 'course_available_live';

  let rendered = null;
  try {
    rendered = await renderTemplate(targetTemplateKey, {
      studentName: enrollment.full_name || 'there',
      courseTitle: course.title || 'Course',
      courseUrl,
      attendanceType: attendanceTypeLabel,
      status: enrollment.status
    });
  } catch (_) {
    // Fallback to general course_available if specific template is missing
  }

  if (!rendered) {
    rendered = await renderTemplate('course_available', {
      studentName: enrollment.full_name || 'there',
      courseTitle: course.title || 'Course',
      courseUrl,
      attendanceType: attendanceTypeLabel,
      status: enrollment.status
    });
  }

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
 * Notify course enrollments.
 * If the first session has no video content, recordings_only enrollments are held back
 * and only live_attendance members are informed.
 */
async function notifyCourseEnrollments(course, enrollments, options = {}) {
  const { sendEmail } = await import('./email.mjs');
  const { User } = require('../models');
  const { Op } = require('sequelize');
  const results = {
    sent: 0,
    failed: 0,
    skipped: 0,
    live_notified: 0,
    recordings_notified: 0,
    held_back_recordings: 0,
    has_video: false,
    first_lesson_title: null,
    errors: []
  };

  const videoCheck = options.hasVideo !== undefined
    ? { hasVideo: Boolean(options.hasVideo), firstLesson: options.firstLesson || null }
    : await checkFirstSessionHasVideo(course.course_id);

  results.has_video = videoCheck.hasVideo;
  results.first_lesson_title = videoCheck.firstLesson?.title || null;

  // Filter enrollments: if no video in session 1, hold back recordings_only members
  const eligibleEnrollments = [];
  for (const enrollment of enrollments) {
    if (!enrollment.email) continue;
    if (enrollment.attendance_type === 'recordings_only' && !videoCheck.hasVideo) {
      results.held_back_recordings += 1;
      continue;
    }
    eligibleEnrollments.push(enrollment);
  }

  const emails = [
    ...new Set(
      eligibleEnrollments
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

  for (const enrollment of eligibleEnrollments) {
    const key = String(enrollment.email).trim().toLowerCase();
    const user = byEmail.get(key);
    if (user?.email_unsubscribed_at) {
      results.skipped += 1;
      continue;
    }
    try {
      await sendCourseAvailableEmail(enrollment, course, sendEmail, user?.user_id);
      results.sent += 1;
      if (enrollment.attendance_type === 'recordings_only') {
        results.recordings_notified += 1;
      } else {
        results.live_notified += 1;
      }
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
  checkFirstSessionHasVideo,
  sendCourseAvailableEmail,
  notifyCourseEnrollments
};
