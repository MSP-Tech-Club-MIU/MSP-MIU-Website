/**
 * Verification test script for feedback workflow
 */
require('dotenv').config();
const { Feedback, Event, Course, CourseLesson, Competition, sequelize } = require('../models');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('DB connected successfully.');

    // 1. Create a General Feedback
    const generalFb = await Feedback.create({
      target_type: 'general',
      rating: 5,
      positives: 'Awesome club atmosphere and friendly community',
      negatives: 'Website could use a dark mode toggle',
      feedback: 'Overall having a wonderful time participating in club sessions.',
      name: 'Test Member',
      email: 'testmember@miuegypt.edu.eg',
      anonymous: false
    });
    console.log(`Created general feedback ID: ${generalFb.feedback_id}`);

    // 2. Create an Event Feedback
    const event = await Event.findOne();
    let eventFb = null;
    if (event) {
      eventFb = await Feedback.create({
        target_type: 'event',
        target_id: event.event_id,
        rating: 4,
        positives: 'Very engaging presentation and hands-on exercises',
        negatives: 'Room was a bit crowded',
        feedback: 'Would love a follow-up part 2 on this topic!',
        anonymous: true
      });
      console.log(`Created event feedback ID: ${eventFb.feedback_id} for Event #${event.event_id}`);
    }

    // 3. Create a Course Feedback
    const course = await Course.findOne();
    let courseFb = null;
    if (course) {
      courseFb = await Feedback.create({
        target_type: 'course',
        target_id: course.course_id,
        course_id: course.course_id,
        rating: 5,
        positives: 'Structured curriculum, great mentor support',
        negatives: 'More code challenges would be welcome',
        feedback: 'Learned so much from this course!',
        name: 'Learner User',
        anonymous: false
      });
      console.log(`Created course feedback ID: ${courseFb.feedback_id} for Course #${course.course_id}`);
    }

    // 4. Test Query with relations
    const all = await Feedback.findAll({
      where: {
        feedback_id: [generalFb.feedback_id, eventFb?.feedback_id, courseFb?.feedback_id].filter(Boolean)
      },
      include: [
        { model: Event, as: 'event', attributes: ['event_id', 'name'], required: false },
        { model: Course, as: 'course', attributes: ['course_id', 'title'], required: false }
      ]
    });
    console.log(`Retrieved ${all.length} test feedbacks with relations:`);
    for (const item of all) {
      console.log(` - [#${item.feedback_id}] [${item.target_type}] Rating: ${item.rating}* | Positives: "${item.positives?.slice(0, 30)}..." | Target: ${item.event?.name || item.course?.title || 'General'}`);
    }

    // 5. Test stats computation
    const totalCount = await Feedback.count();
    console.log(`Total feedbacks in system: ${totalCount}`);

    // Clean up test items
    await generalFb.destroy();
    if (eventFb) await eventFb.destroy();
    if (courseFb) await courseFb.destroy();
    console.log('Cleaned up test feedback items successfully.');

    console.log('All backend feedback tests PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

run();
