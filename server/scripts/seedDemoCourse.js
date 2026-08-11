/**
 * Seed a full demo published course (lessons, YouTube, sample materials, sample enrollments).
 *
 * Marker: title starts with "[DEMO]" so cleanup is safe.
 *
 *   node scripts/seedDemoCourse.js
 *   node scripts/removeDemoCourse.js
 */
require('dotenv').config();
const crypto = require('crypto');
const {
  Course,
  CourseLesson,
  CourseLessonMaterial,
  CourseEnrollment,
  CourseLessonProgress,
  Season,
  sequelize
} = require('../models');

const DEMO_TITLE = '[DEMO] Intro to Web Development';

async function getSeasonId() {
  const def = await Season.findOne({ where: { is_default: true }, order: [['season_id', 'ASC']] });
  if (def) return def.season_id;
  const any = await Season.findOne({ order: [['season_id', 'DESC']] });
  return any ? any.season_id : null;
}

async function main() {
  await sequelize.authenticate();

  const existing = await Course.findOne({ where: { title: DEMO_TITLE } });
  if (existing) {
    console.log(`Demo course already exists (course_id=${existing.course_id}).`);
    console.log(`Open: /courses/${existing.course_id}`);
    console.log('Remove with: node scripts/removeDemoCourse.js');
    process.exit(0);
  }

  const season_id = await getSeasonId();
  const course = await Course.create({
    title: DEMO_TITLE,
    description:
      'A sample MSP course so you can preview the public lesson UI, YouTube embeds, downloads, registration, and progress.\n\nThis is demo data — remove anytime with node scripts/removeDemoCourse.js',
    thumbnail_url: null,
    status: 'published',
    season_id,
    published_at: new Date(),
    notify_sent_at: null
  });

  const lesson1 = await CourseLesson.create({
    course_id: course.course_id,
    title: 'Welcome & Course Overview',
    description: 'What you will learn and how to use this course page.',
    sort_order: 0,
    is_published: true
  });

  const lesson2 = await CourseLesson.create({
    course_id: course.course_id,
    title: 'HTML & CSS Basics',
    description: 'Watch the video, then download the starter notes.',
    sort_order: 1,
    is_published: true
  });

  const lesson3 = await CourseLesson.create({
    course_id: course.course_id,
    title: 'JavaScript Crash Intro',
    description: 'Short intro video plus a sample script file entry.',
    sort_order: 2,
    is_published: true
  });

  // YouTube: official MDN / free educational samples (public)
  await CourseLessonMaterial.bulkCreate([
    {
      lesson_id: lesson1.lesson_id,
      title: 'Welcome video',
      material_type: 'youtube',
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      sort_order: 0
    },
    {
      lesson_id: lesson1.lesson_id,
      title: 'Syllabus (placeholder PDF link)',
      material_type: 'document',
      file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      file_name: 'syllabus-demo.pdf',
      sort_order: 1
    },
    {
      lesson_id: lesson2.lesson_id,
      title: 'HTML in 5 minutes',
      material_type: 'youtube',
      youtube_url: 'https://www.youtube.com/watch?v=UB1O30fR-EE',
      sort_order: 0
    },
    {
      lesson_id: lesson2.lesson_id,
      title: 'CSS in 5 minutes',
      material_type: 'youtube',
      youtube_url: 'https://www.youtube.com/watch?v=1PnVor36_40',
      sort_order: 1
    },
    {
      lesson_id: lesson2.lesson_id,
      title: 'Starter notes PDF',
      material_type: 'document',
      file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      file_name: 'html-css-notes.pdf',
      sort_order: 2
    },
    {
      lesson_id: lesson3.lesson_id,
      title: 'JavaScript in 5 minutes',
      material_type: 'youtube',
      youtube_url: 'https://www.youtube.com/watch?v=W6NZfCO5SIk',
      sort_order: 0
    },
    {
      lesson_id: lesson3.lesson_id,
      title: 'hello.js (sample code file URL)',
      material_type: 'code',
      file_url: 'https://raw.githubusercontent.com/mdn/learning-area/main/javascript/introduction-to-js-1/what-is-js/apply.html',
      file_name: 'hello-sample.html',
      sort_order: 1
    },
    {
      lesson_id: lesson3.lesson_id,
      title: 'Resources zip (placeholder)',
      material_type: 'zip',
      file_url: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-zip-file.zip',
      file_name: 'resources-demo.zip',
      sort_order: 2
    }
  ]);

  const token1 = crypto.randomBytes(32).toString('hex');
  const token2 = crypto.randomBytes(32).toString('hex');

  const enroll1 = await CourseEnrollment.create({
    course_id: course.course_id,
    full_name: 'Demo Student One',
    email: 'demo.student1@example.com',
    phone_number: '01000000001',
    university_id: 'DEMO/00001',
    status: 'enrolled',
    access_token: token1,
    attended: true
  });

  await CourseEnrollment.create({
    course_id: course.course_id,
    full_name: 'Demo Student Two',
    email: 'demo.student2@example.com',
    phone_number: '01000000002',
    university_id: 'DEMO/00002',
    status: 'preordered',
    access_token: token2,
    attended: false
  });

  await CourseLessonProgress.bulkCreate([
    { enrollment_id: enroll1.enrollment_id, lesson_id: lesson1.lesson_id, completed_at: new Date() },
    { enrollment_id: enroll1.enrollment_id, lesson_id: lesson2.lesson_id, completed_at: new Date() }
  ]);

  console.log('Demo course created successfully.');
  console.log(`  course_id : ${course.course_id}`);
  console.log(`  title     : ${DEMO_TITLE}`);
  console.log(`  status    : published`);
  console.log(`  public UI : /courses/${course.course_id}`);
  console.log(`  learn UI  : /courses/${course.course_id}/learn?token=${token1}`);
  console.log(`  admin     : /admin/courses?view=content&id=${course.course_id}`);
  console.log(`  progress token (student 1): ${token1}`);
  console.log(`  open with token: /courses/${course.course_id}/learn?token=${token1}`);
  console.log('Remove later with: node scripts/removeDemoCourse.js');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('seedDemoCourse failed:', err);
    process.exit(1);
  });
