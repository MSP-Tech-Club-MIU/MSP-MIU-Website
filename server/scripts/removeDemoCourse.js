/**
 * Remove the demo course created by seedDemoCourse.js (and all nested data via CASCADE).
 *
 *   node scripts/removeDemoCourse.js
 */
require('dotenv').config();
const { Course, sequelize } = require('../models');

const DEMO_TITLE = '[DEMO] Intro to Web Development';

async function main() {
  await sequelize.authenticate();

  const course = await Course.findOne({ where: { title: DEMO_TITLE } });
  if (!course) {
    console.log('No demo course found. Nothing to remove.');
    process.exit(0);
  }

  const id = course.course_id;
  await course.destroy();
  console.log(`Removed demo course course_id=${id} ("${DEMO_TITLE}").`);
  console.log('Lessons, materials, enrollments, and progress were deleted via CASCADE.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('removeDemoCourse failed:', err);
    process.exit(1);
  });
