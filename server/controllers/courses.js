const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  Course,
  CourseLesson,
  CourseLessonMaterial,
  CourseEnrollment,
  CourseLessonProgress
} = require('../models');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { resolveSeasonFilter, seasonInclude, resolveSeasonIdForWrite } = require('../utils/seasonFilter');
const { notifyCourseEnrollments } = require('../utils/courseAvailableEmail');
const logger = require('../utils/logger');

const VALID_STATUSES = ['draft', 'coming_soon', 'published', 'archived'];
const VALID_MATERIAL_TYPES = ['youtube', 'document', 'zip', 'code', 'other'];
const PUBLIC_LIST_STATUSES = ['coming_soon', 'published'];

function makeAccessToken() {
  return crypto.randomBytes(32).toString('hex');
}

function lessonInclude(publishedOnly = false) {
  const lessonWhere = publishedOnly ? { is_published: true } : undefined;
  return {
    model: CourseLesson,
    as: 'lessons',
    where: lessonWhere,
    required: false,
    separate: true,
    order: [['sort_order', 'ASC'], ['lesson_id', 'ASC']],
    include: [{
      model: CourseLessonMaterial,
      as: 'materials',
      separate: true,
      order: [['sort_order', 'ASC'], ['material_id', 'ASC']]
    }]
  };
}

async function findCourseOr404(id, res, options = {}) {
  const course = await Course.findByPk(id, options);
  if (!course) {
    res.status(404).json({ success: false, error: 'Course not found' });
    return null;
  }
  return course;
}

/**
 * GET /courses — public list (coming_soon + published)
 * Admin with ?admin=1 or Authorization sees all statuses when using admin list route.
 */
const listCourses = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 12 });
    const season = await resolveSeasonFilter(req.query);
    const where = { ...season.where };

    const status = req.query.status;
    const isAdminList = req.query.admin === '1' || req.isAdminCoursesList;
    if (isAdminList) {
      if (status && VALID_STATUSES.includes(status)) where.status = status;
    } else if (status && PUBLIC_LIST_STATUSES.includes(status)) {
      where.status = status;
    } else {
      where.status = { [Op.in]: PUBLIC_LIST_STATUSES };
    }

    const include = [];
    if (season.includeSeason) {
      include.push(seasonInclude());
    }

    const { count, rows } = await Course.findAndCountAll({
      where,
      include,
      order: [['created_at', 'DESC'], ['course_id', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    res.json({
      success: true,
      data: rows,
      pagination: paginationMeta({ page, limit, total: count })
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    logger.error('listCourses:', error);
    res.status(500).json({ success: false, error: 'Failed to list courses' });
  }
};

const listCoursesAdmin = async (req, res) => {
  req.isAdminCoursesList = true;
  return listCourses(req, res);
};

/**
 * GET /courses/:id
 */
const getCourseById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid course id' });
    }

    const isAdmin = Boolean(req.user && ['admin', 'board'].includes(req.user.role));
    const course = await Course.findByPk(id, {
      include: [
        seasonInclude(false),
        lessonInclude(!(isAdmin && req.query.admin === '1'))
      ].filter(Boolean)
    });

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const adminDetail = isAdmin && req.query.admin === '1';
    if (!adminDetail && !PUBLIC_LIST_STATUSES.includes(course.status) && course.status !== 'archived') {
      // draft hidden from public
      if (course.status === 'draft') {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }
    }
    if (!adminDetail && course.status === 'draft') {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const payload = course.toJSON();
    // coming_soon: hide lesson content from public (metadata only)
    if (!adminDetail && course.status === 'coming_soon') {
      payload.lessons = [];
      payload.lessons_locked = true;
    } else if (!adminDetail && course.status === 'published') {
      payload.lessons = (payload.lessons || []).filter((l) => l.is_published !== false);
    }

    res.json({ success: true, data: payload });
  } catch (error) {
    logger.error('getCourseById:', error);
    res.status(500).json({ success: false, error: 'Failed to get course' });
  }
};

/**
 * GET /courses/:id/admin — full admin detail with all lessons
 */
const getCourseAdmin = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const course = await Course.findByPk(id, {
      include: [seasonInclude(false), lessonInclude(false)].filter(Boolean)
    });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    res.json({ success: true, data: course });
  } catch (error) {
    logger.error('getCourseAdmin:', error);
    res.status(500).json({ success: false, error: 'Failed to get course' });
  }
};

/**
 * POST /courses
 */
const createCourse = async (req, res) => {
  try {
    const { title, description, thumbnail_url, status } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, error: 'title is required' });
    }
    const nextStatus = status && VALID_STATUSES.includes(status) ? status : 'draft';
    const season_id = await resolveSeasonIdForWrite(req.body, req.query);

    const course = await Course.create({
      title: String(title).trim(),
      description: description || null,
      thumbnail_url: thumbnail_url || null,
      status: nextStatus,
      season_id,
      published_at: nextStatus === 'published' ? new Date() : null
    });

    res.status(201).json({ success: true, message: 'Course created', data: course });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    logger.error('createCourse:', error);
    res.status(500).json({ success: false, error: 'Failed to create course' });
  }
};

/**
 * PUT /courses/:id
 */
const updateCourse = async (req, res) => {
  try {
    const course = await findCourseOr404(req.params.id, res);
    if (!course) return;

    const { title, description, thumbnail_url, season_id } = req.body;
    if (title !== undefined) {
      if (!String(title).trim()) {
        return res.status(400).json({ success: false, error: 'title cannot be empty' });
      }
      course.title = String(title).trim();
    }
    if (description !== undefined) course.description = description || null;
    if (thumbnail_url !== undefined) course.thumbnail_url = thumbnail_url || null;
    if (season_id !== undefined || req.body.season !== undefined) {
      course.season_id = await resolveSeasonIdForWrite(req.body, req.query);
    }

    await course.save();
    res.json({ success: true, message: 'Course updated', data: course });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    logger.error('updateCourse:', error);
    res.status(500).json({ success: false, error: 'Failed to update course' });
  }
};

/**
 * PUT /courses/:id/status — publish triggers notify once
 */
const updateCourseStatus = async (req, res) => {
  try {
    const course = await findCourseOr404(req.params.id, res);
    if (!course) return;

    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    const prev = course.status;
    course.status = status;
    if (status === 'published' && !course.published_at) {
      course.published_at = new Date();
    }

    let notifyResult = null;
    if (status === 'published' && !course.notify_sent_at) {
      const enrollments = await CourseEnrollment.findAll({
        where: {
          course_id: course.course_id,
          status: { [Op.in]: ['preordered', 'enrolled'] }
        }
      });
      notifyResult = await notifyCourseEnrollments(course, enrollments);
      course.notify_sent_at = new Date();
      if (enrollments.length > 0) {
        await CourseEnrollment.update(
          { status: 'notified' },
          {
            where: {
              course_id: course.course_id,
              status: 'preordered'
            }
          }
        );
      }
    }

    await course.save();
    res.json({
      success: true,
      message: `Course status updated from ${prev} to ${status}`,
      data: course,
      notify: notifyResult
    });
  } catch (error) {
    logger.error('updateCourseStatus:', error);
    res.status(500).json({ success: false, error: 'Failed to update course status' });
  }
};

/**
 * DELETE /courses/:id
 */
const deleteCourse = async (req, res) => {
  try {
    const course = await findCourseOr404(req.params.id, res);
    if (!course) return;
    await course.destroy();
    res.json({ success: true, message: 'Course deleted' });
  } catch (error) {
    logger.error('deleteCourse:', error);
    res.status(500).json({ success: false, error: 'Failed to delete course' });
  }
};

/** Lessons */
const createLesson = async (req, res) => {
  try {
    const course = await findCourseOr404(req.params.id, res);
    if (!course) return;

    const { title, description, sort_order, is_published } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, error: 'title is required' });
    }

    let order = sort_order;
    if (order === undefined || order === null) {
      const max = await CourseLesson.max('sort_order', { where: { course_id: course.course_id } });
      order = (Number.isFinite(max) ? max : -1) + 1;
    }

    const lesson = await CourseLesson.create({
      course_id: course.course_id,
      title: String(title).trim(),
      description: description || null,
      sort_order: Number(order) || 0,
      is_published: is_published === undefined ? true : Boolean(is_published)
    });

    res.status(201).json({ success: true, data: lesson });
  } catch (error) {
    logger.error('createLesson:', error);
    res.status(500).json({ success: false, error: 'Failed to create lesson' });
  }
};

const updateLesson = async (req, res) => {
  try {
    const lesson = await CourseLesson.findOne({
      where: { lesson_id: req.params.lessonId, course_id: req.params.id }
    });
    if (!lesson) {
      return res.status(404).json({ success: false, error: 'Lesson not found' });
    }

    const { title, description, sort_order, is_published } = req.body;
    if (title !== undefined) {
      if (!String(title).trim()) {
        return res.status(400).json({ success: false, error: 'title cannot be empty' });
      }
      lesson.title = String(title).trim();
    }
    if (description !== undefined) lesson.description = description || null;
    if (sort_order !== undefined) lesson.sort_order = Number(sort_order) || 0;
    if (is_published !== undefined) lesson.is_published = Boolean(is_published);

    await lesson.save();
    res.json({ success: true, data: lesson });
  } catch (error) {
    logger.error('updateLesson:', error);
    res.status(500).json({ success: false, error: 'Failed to update lesson' });
  }
};

const deleteLesson = async (req, res) => {
  try {
    const lesson = await CourseLesson.findOne({
      where: { lesson_id: req.params.lessonId, course_id: req.params.id }
    });
    if (!lesson) {
      return res.status(404).json({ success: false, error: 'Lesson not found' });
    }
    await lesson.destroy();
    res.json({ success: true, message: 'Lesson deleted' });
  } catch (error) {
    logger.error('deleteLesson:', error);
    res.status(500).json({ success: false, error: 'Failed to delete lesson' });
  }
};

const reorderLessons = async (req, res) => {
  try {
    const courseId = parseInt(req.params.id, 10);
    const order = Array.isArray(req.body?.order) ? req.body.order : null;
    if (!order) {
      return res.status(400).json({ success: false, error: 'order array required' });
    }
    await Promise.all(
      order.map((lessonId, index) =>
        CourseLesson.update(
          { sort_order: index },
          { where: { lesson_id: lessonId, course_id: courseId } }
        )
      )
    );
    res.json({ success: true, message: 'Lessons reordered' });
  } catch (error) {
    logger.error('reorderLessons:', error);
    res.status(500).json({ success: false, error: 'Failed to reorder lessons' });
  }
};

/** Materials */
const createMaterial = async (req, res) => {
  try {
    const lesson = await CourseLesson.findOne({
      where: { lesson_id: req.params.lessonId, course_id: req.params.id }
    });
    if (!lesson) {
      return res.status(404).json({ success: false, error: 'Lesson not found' });
    }

    const { title, material_type, youtube_url, file_url, file_name, sort_order } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, error: 'title is required' });
    }
    if (!VALID_MATERIAL_TYPES.includes(material_type)) {
      return res.status(400).json({
        success: false,
        error: `material_type must be one of: ${VALID_MATERIAL_TYPES.join(', ')}`
      });
    }
    if (material_type === 'youtube' && !youtube_url) {
      return res.status(400).json({ success: false, error: 'youtube_url is required for youtube materials' });
    }
    if (material_type !== 'youtube' && !file_url) {
      return res.status(400).json({ success: false, error: 'file_url is required for file materials' });
    }

    let order = sort_order;
    if (order === undefined || order === null) {
      const max = await CourseLessonMaterial.max('sort_order', { where: { lesson_id: lesson.lesson_id } });
      order = (Number.isFinite(max) ? max : -1) + 1;
    }

    const material = await CourseLessonMaterial.create({
      lesson_id: lesson.lesson_id,
      title: String(title).trim(),
      material_type,
      youtube_url: material_type === 'youtube' ? youtube_url : null,
      file_url: material_type !== 'youtube' ? file_url : null,
      file_name: file_name || null,
      sort_order: Number(order) || 0
    });

    res.status(201).json({ success: true, data: material });
  } catch (error) {
    logger.error('createMaterial:', error);
    res.status(500).json({ success: false, error: 'Failed to create material' });
  }
};

const updateMaterial = async (req, res) => {
  try {
    const lesson = await CourseLesson.findOne({
      where: { lesson_id: req.params.lessonId, course_id: req.params.id }
    });
    if (!lesson) {
      return res.status(404).json({ success: false, error: 'Lesson not found' });
    }

    const material = await CourseLessonMaterial.findOne({
      where: { material_id: req.params.materialId, lesson_id: lesson.lesson_id }
    });
    if (!material) {
      return res.status(404).json({ success: false, error: 'Material not found' });
    }

    const { title, material_type, youtube_url, file_url, file_name, sort_order } = req.body;
    if (title !== undefined) material.title = String(title).trim();
    if (material_type !== undefined) {
      if (!VALID_MATERIAL_TYPES.includes(material_type)) {
        return res.status(400).json({ success: false, error: 'Invalid material_type' });
      }
      material.material_type = material_type;
    }
    if (youtube_url !== undefined) material.youtube_url = youtube_url || null;
    if (file_url !== undefined) material.file_url = file_url || null;
    if (file_name !== undefined) material.file_name = file_name || null;
    if (sort_order !== undefined) material.sort_order = Number(sort_order) || 0;

    await material.save();
    res.json({ success: true, data: material });
  } catch (error) {
    logger.error('updateMaterial:', error);
    res.status(500).json({ success: false, error: 'Failed to update material' });
  }
};

const deleteMaterial = async (req, res) => {
  try {
    const lesson = await CourseLesson.findOne({
      where: { lesson_id: req.params.lessonId, course_id: req.params.id }
    });
    if (!lesson) {
      return res.status(404).json({ success: false, error: 'Lesson not found' });
    }
    const material = await CourseLessonMaterial.findOne({
      where: { material_id: req.params.materialId, lesson_id: lesson.lesson_id }
    });
    if (!material) {
      return res.status(404).json({ success: false, error: 'Material not found' });
    }
    await material.destroy();
    res.json({ success: true, message: 'Material deleted' });
  } catch (error) {
    logger.error('deleteMaterial:', error);
    res.status(500).json({ success: false, error: 'Failed to delete material' });
  }
};

/**
 * POST /courses/:id/enroll
 */
const enrollInCourse = async (req, res) => {
  try {
    const course = await findCourseOr404(req.params.id, res);
    if (!course) return;

    if (!['coming_soon', 'published'].includes(course.status)) {
      return res.status(403).json({
        success: false,
        error: 'Registration is not open for this course'
      });
    }

    const { full_name, email, phone_number, university_id } = req.body;
    if (!full_name || !email || !phone_number || !university_id) {
      return res.status(400).json({
        success: false,
        error: 'full_name, email, phone_number, and university_id are required'
      });
    }

    const existing = await CourseEnrollment.findOne({
      where: {
        course_id: course.course_id,
        [Op.or]: [
          { university_id: String(university_id).trim() },
          { email: String(email).trim().toLowerCase() }
        ]
      }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'You are already registered for this course',
        data: { access_token: existing.access_token }
      });
    }

    const enrollment = await CourseEnrollment.create({
      course_id: course.course_id,
      full_name: String(full_name).trim(),
      email: String(email).trim().toLowerCase(),
      phone_number: String(phone_number).trim(),
      university_id: String(university_id).trim(),
      status: course.status === 'published' ? 'enrolled' : 'preordered',
      access_token: makeAccessToken(),
      attended: false
    });

    res.status(201).json({
      success: true,
      message: course.status === 'coming_soon'
        ? 'Interest registered. We will email you when the course is available.'
        : 'Enrolled successfully',
      data: {
        enrollment_id: enrollment.enrollment_id,
        access_token: enrollment.access_token,
        status: enrollment.status
      }
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: 'Already registered for this course' });
    }
    logger.error('enrollInCourse:', error);
    res.status(500).json({ success: false, error: 'Failed to enroll' });
  }
};

/**
 * POST /courses/:id/enroll/me — enroll using the logged-in MSP account profile.
 */
const enrollWithAccount = async (req, res) => {
  try {
    const course = await findCourseOr404(req.params.id, res);
    if (!course) return;

    if (!['coming_soon', 'published'].includes(course.status)) {
      return res.status(403).json({
        success: false,
        error: 'Registration is not open for this course'
      });
    }

    const { User, Member } = require('../models');
    const user = await User.findByPk(req.user.user_id, {
      attributes: ['user_id', 'full_name', 'email', 'university_id']
    });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const email = String(user.email || '').trim().toLowerCase();
    const university_id = String(user.university_id || '').trim();
    const full_name = String(user.full_name || '').trim() || university_id || email;

    if (!email || !university_id) {
      return res.status(400).json({
        success: false,
        error: 'Your MSP account is missing email or university ID. Update your profile and try again.'
      });
    }

    const existing = await CourseEnrollment.findOne({
      where: {
        course_id: course.course_id,
        [Op.or]: [{ university_id }, { email }]
      }
    });
    if (existing) {
      return res.json({
        success: true,
        message: 'Already registered with your MSP account',
        data: {
          enrollment_id: existing.enrollment_id,
          access_token: existing.access_token,
          status: existing.status,
          from_account: true
        }
      });
    }

    let phone_number = 'MSP-account';
    try {
      const member = await Member.findOne({
        where: { user_id: user.user_id },
        attributes: ['phone_number'],
        order: [['member_id', 'DESC']]
      });
      if (member?.phone_number) phone_number = String(member.phone_number).trim();
    } catch {
      /* optional */
    }

    const enrollment = await CourseEnrollment.create({
      course_id: course.course_id,
      full_name,
      email,
      phone_number,
      university_id,
      status: course.status === 'published' ? 'enrolled' : 'preordered',
      access_token: makeAccessToken(),
      attended: false
    });

    res.status(201).json({
      success: true,
      message: course.status === 'coming_soon'
        ? 'You will be notified when the course is available.'
        : 'Enrolled with your MSP account',
      data: {
        enrollment_id: enrollment.enrollment_id,
        access_token: enrollment.access_token,
        status: enrollment.status,
        from_account: true
      }
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: 'Already registered for this course' });
    }
    logger.error('enrollWithAccount:', error);
    res.status(500).json({ success: false, error: 'Failed to enroll with account' });
  }
};

/**
 * POST /courses/:id/progress  body: { token, lesson_id }
 */
const markLessonComplete = async (req, res) => {
  try {
    const courseId = parseInt(req.params.id, 10);
    const token = String(req.body?.token || req.query?.token || '').trim();
    const lessonId = parseInt(req.body?.lesson_id, 10);

    if (!token || !Number.isFinite(lessonId)) {
      return res.status(400).json({ success: false, error: 'token and lesson_id are required' });
    }

    const enrollment = await CourseEnrollment.findOne({
      where: { course_id: courseId, access_token: token }
    });
    if (!enrollment) {
      return res.status(404).json({ success: false, error: 'Enrollment not found' });
    }

    const lesson = await CourseLesson.findOne({
      where: { lesson_id: lessonId, course_id: courseId, is_published: true }
    });
    if (!lesson) {
      return res.status(404).json({ success: false, error: 'Lesson not found' });
    }

    const [progress] = await CourseLessonProgress.findOrCreate({
      where: {
        enrollment_id: enrollment.enrollment_id,
        lesson_id: lessonId
      },
      defaults: { completed_at: new Date() }
    });

    if (enrollment.status === 'preordered' || enrollment.status === 'notified') {
      enrollment.status = 'enrolled';
      await enrollment.save();
    }

    res.json({ success: true, data: progress });
  } catch (error) {
    logger.error('markLessonComplete:', error);
    res.status(500).json({ success: false, error: 'Failed to mark lesson complete' });
  }
};

/**
 * GET /courses/:id/my-progress?token=
 */
const getMyProgress = async (req, res) => {
  try {
    const courseId = parseInt(req.params.id, 10);
    const token = String(req.query.token || '').trim();
    if (!token) {
      return res.status(400).json({ success: false, error: 'token is required' });
    }

    const enrollment = await CourseEnrollment.findOne({
      where: { course_id: courseId, access_token: token },
      include: [{
        model: CourseLessonProgress,
        as: 'lessonProgress'
      }]
    });
    if (!enrollment) {
      return res.status(404).json({ success: false, error: 'Enrollment not found' });
    }

    const lessonCount = await CourseLesson.count({
      where: { course_id: courseId, is_published: true }
    });
    const completed = enrollment.lessonProgress || [];

    res.json({
      success: true,
      data: {
        enrollment_id: enrollment.enrollment_id,
        status: enrollment.status,
        attended: enrollment.attended,
        completed_lesson_ids: completed.map((p) => p.lesson_id),
        completed_count: completed.length,
        lesson_count: lessonCount,
        completion_percent: lessonCount === 0 ? 0 : Math.round((completed.length / lessonCount) * 100)
      }
    });
  } catch (error) {
    logger.error('getMyProgress:', error);
    res.status(500).json({ success: false, error: 'Failed to get progress' });
  }
};

/**
 * GET /courses/:id/enrollments or /courses/enrollments
 */
const listEnrollments = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    const courseId = req.params.id || req.query.course_id;
    if (courseId) where.course_id = parseInt(courseId, 10);

    const { count, rows } = await CourseEnrollment.findAndCountAll({
      where,
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['course_id', 'title', 'status']
        },
        {
          model: CourseLessonProgress,
          as: 'lessonProgress',
          attributes: ['lesson_id', 'completed_at']
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    // Attach completion % using published lesson counts per course
    const courseIds = [...new Set(rows.map((r) => r.course_id))];
    const lessonCounts = {};
    await Promise.all(
      courseIds.map(async (cid) => {
        lessonCounts[cid] = await CourseLesson.count({
          where: { course_id: cid, is_published: true }
        });
      })
    );

    const data = rows.map((row) => {
      const json = row.toJSON();
      const total = lessonCounts[row.course_id] || 0;
      const done = (json.lessonProgress || []).length;
      json.completed_count = done;
      json.lesson_count = total;
      json.completion_percent = total === 0 ? 0 : Math.round((done / total) * 100);
      return json;
    });

    res.json({
      success: true,
      data,
      pagination: paginationMeta({ page, limit, total: count })
    });
  } catch (error) {
    logger.error('listEnrollments:', error);
    res.status(500).json({ success: false, error: 'Failed to list enrollments' });
  }
};

const updateEnrollment = async (req, res) => {
  try {
    const enrollment = await CourseEnrollment.findByPk(req.params.enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ success: false, error: 'Enrollment not found' });
    }
    if (req.params.id && String(enrollment.course_id) !== String(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Enrollment not found' });
    }

    if (req.body.attended !== undefined) {
      enrollment.attended = Boolean(req.body.attended);
    }
    if (req.body.status && ['preordered', 'notified', 'enrolled'].includes(req.body.status)) {
      enrollment.status = req.body.status;
    }
    await enrollment.save();
    res.json({ success: true, data: enrollment });
  } catch (error) {
    logger.error('updateEnrollment:', error);
    res.status(500).json({ success: false, error: 'Failed to update enrollment' });
  }
};

const deleteEnrollment = async (req, res) => {
  try {
    const enrollment = await CourseEnrollment.findByPk(req.params.enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ success: false, error: 'Enrollment not found' });
    }
    if (req.params.id && String(enrollment.course_id) !== String(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Enrollment not found' });
    }
    await enrollment.destroy();
    res.json({ success: true, message: 'Enrollment deleted' });
  } catch (error) {
    logger.error('deleteEnrollment:', error);
    res.status(500).json({ success: false, error: 'Failed to delete enrollment' });
  }
};

const exportEnrollmentsCSV = async (req, res) => {
  try {
    const where = {};
    const courseId = req.params.id || req.query.course_id;
    if (courseId) where.course_id = parseInt(courseId, 10);

    const rows = await CourseEnrollment.findAll({
      where,
      include: [
        { model: Course, as: 'course', attributes: ['title'] },
        { model: CourseLessonProgress, as: 'lessonProgress', attributes: ['lesson_id'] }
      ],
      order: [['created_at', 'ASC']]
    });

    const courseIds = [...new Set(rows.map((r) => r.course_id))];
    const lessonCounts = {};
    await Promise.all(
      courseIds.map(async (cid) => {
        lessonCounts[cid] = await CourseLesson.count({
          where: { course_id: cid, is_published: true }
        });
      })
    );

    const escapeCSV = (val) => {
      const s = val == null ? '' : String(val);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const headers = [
      '#', 'Course', 'Full Name', 'Email', 'Phone', 'University ID',
      'Status', 'Attended', 'Lessons Completed', 'Lesson Count', 'Completion %', 'Registered At'
    ];

    const csvRows = rows.map((row, index) => {
      const total = lessonCounts[row.course_id] || 0;
      const done = (row.lessonProgress || []).length;
      const pct = total === 0 ? 0 : Math.round((done / total) * 100);
      return [
        index + 1,
        row.course?.title || '',
        row.full_name,
        row.email,
        row.phone_number,
        row.university_id,
        row.status,
        row.attended ? 'Yes' : 'No',
        done,
        total,
        pct,
        row.created_at ? new Date(row.created_at).toISOString() : ''
      ].map(escapeCSV).join(',');
    });

    const csvContent = [headers.map(escapeCSV).join(','), ...csvRows].join('\r\n');
    const BOM = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv;charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=course_enrollments_${new Date().toISOString().split('T')[0]}.csv`
    );
    res.send(Buffer.from(BOM + csvContent, 'utf8'));
  } catch (error) {
    logger.error('exportEnrollmentsCSV:', error);
    res.status(500).json({ success: false, error: 'Failed to export enrollments' });
  }
};

module.exports = {
  listCourses,
  listCoursesAdmin,
  getCourseById,
  getCourseAdmin,
  createCourse,
  updateCourse,
  updateCourseStatus,
  deleteCourse,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  enrollInCourse,
  enrollWithAccount,
  markLessonComplete,
  getMyProgress,
  listEnrollments,
  updateEnrollment,
  deleteEnrollment,
  exportEnrollmentsCSV
};
