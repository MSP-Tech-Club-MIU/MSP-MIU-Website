const express = require('express');
const router = express.Router();
const { authenticateToken, verifyRole } = require('../middlewares/auth');
const {
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
} = require('../controllers/courses');

const admin = [authenticateToken, verifyRole('admin', 'board')];

// Public
router.get('/', listCourses);
router.get('/:id/my-progress', getMyProgress);
router.post('/:id/enroll/me', authenticateToken, enrollWithAccount);
router.post('/:id/enroll', enrollInCourse);
router.post('/:id/progress', markLessonComplete);

// Admin list / enrollments (before :id to avoid conflicts where needed)
router.get('/admin/list', ...admin, listCoursesAdmin);
router.get('/admin/enrollments', ...admin, listEnrollments);
router.get('/admin/enrollments/export', ...admin, exportEnrollmentsCSV);
router.put('/admin/enrollments/:enrollmentId', ...admin, updateEnrollment);
router.delete('/admin/enrollments/:enrollmentId', ...admin, deleteEnrollment);

router.get('/:id/admin', ...admin, getCourseAdmin);
router.get('/:id/enrollments', ...admin, listEnrollments);
router.get('/:id/enrollments/export', ...admin, exportEnrollmentsCSV);
router.put('/:id/enrollments/:enrollmentId', ...admin, updateEnrollment);
router.delete('/:id/enrollments/:enrollmentId', ...admin, deleteEnrollment);

router.post('/', ...admin, createCourse);
router.put('/:id/status', ...admin, updateCourseStatus);
router.put('/:id', ...admin, updateCourse);
router.delete('/:id', ...admin, deleteCourse);

router.post('/:id/lessons', ...admin, createLesson);
router.put('/:id/lessons/reorder', ...admin, reorderLessons);
router.put('/:id/lessons/:lessonId', ...admin, updateLesson);
router.delete('/:id/lessons/:lessonId', ...admin, deleteLesson);

router.post('/:id/lessons/:lessonId/materials', ...admin, createMaterial);
router.put('/:id/lessons/:lessonId/materials/:materialId', ...admin, updateMaterial);
router.delete('/:id/lessons/:lessonId/materials/:materialId', ...admin, deleteMaterial);

router.get('/:id', getCourseById);

module.exports = router;
