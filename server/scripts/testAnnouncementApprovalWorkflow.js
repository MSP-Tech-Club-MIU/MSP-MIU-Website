require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize, User, Board, Announcement, Course, CourseAnnouncement, Competition, CompetitionAnnouncement } = require('../models');
const { isPresidentOrVicePresident } = require('../utils/adminEligibleBoard');

async function runTests() {
  console.log('--- Starting Announcement Approval Workflow Tests ---');
  await sequelize.authenticate();
  console.log('Database connected.');

  // Test 1: Helper test
  console.log('\n[Test 1] Testing isPresidentOrVicePresident helper:');
  const pres = isPresidentOrVicePresident({ position: 'President' });
  const vp = isPresidentOrVicePresident({ position: 'Vice President' });
  const head = isPresidentOrVicePresident({ position: 'Head' });
  const cohead = isPresidentOrVicePresident({ position: 'Co-Head' });
  console.log(`President: ${pres} (expected true)`);
  console.log(`Vice President: ${vp} (expected true)`);
  console.log(`Head: ${head} (expected false)`);
  console.log(`Co-Head: ${cohead} (expected false)`);
  if (!pres || !vp || head || cohead) {
    throw new Error('isPresidentOrVicePresident logic failed');
  }

  // Test 2: Model column checks
  console.log('\n[Test 2] Testing Model instances and attributes:');
  const user = await User.findOne();
  const userId = user ? user.user_id : 1;

  const ann = await Announcement.build({
    title: 'Test Pending Announcement',
    description: 'This is a test description for pending announcement approval.',
    department: 'Technical',
    announcement_date: new Date(),
    send_email: true,
    publish_to_website: false,
    cta_label: 'Learn More',
    cta_url: 'https://example.com',
    approval_status: 'pending',
    approved_by: null,
    created_by: userId,
    email_sent: false
  });
  await ann.save();
  console.log(`Created announcement #${ann.announcement_id} with approval_status: ${ann.approval_status}`);

  // Test 3: Approve announcement flow
  console.log('\n[Test 3] Testing approve announcement update:');
  ann.title = 'Test Edited Announcement (Approved)';
  ann.approval_status = 'approved';
  ann.email_sent = true;
  ann.approved_by = 1;
  await ann.save();

  const reloaded = await Announcement.findByPk(ann.announcement_id);
  console.log(`Reloaded announcement status: ${reloaded.approval_status}, email_sent: ${reloaded.email_sent}, title: "${reloaded.title}"`);
  if (reloaded.approval_status !== 'approved' || reloaded.email_sent !== true || !reloaded.title.includes('Approved')) {
    throw new Error('Announcement approval update failed');
  }

  // Test 4: Reject announcement flow
  console.log('\n[Test 4] Testing reject announcement update:');
  const ann2 = await Announcement.create({
    title: 'Test Rejection Announcement',
    description: 'This should be refused',
    department: 'Logistics',
    announcement_date: new Date(),
    send_email: true,
    publish_to_website: false,
    cta_label: 'Click',
    cta_url: 'https://example.com',
    approval_status: 'pending',
    created_by: userId
  });
  ann2.approval_status = 'rejected';
  ann2.rejection_reason = 'Content does not meet guidelines';
  await ann2.save();

  const reloaded2 = await Announcement.findByPk(ann2.announcement_id);
  console.log(`Reloaded rejected announcement: status=${reloaded2.approval_status}, reason="${reloaded2.rejection_reason}"`);
  if (reloaded2.approval_status !== 'rejected' || reloaded2.rejection_reason !== 'Content does not meet guidelines') {
    throw new Error('Announcement rejection update failed');
  }

  // Cleanup test records
  await ann.destroy();
  await ann2.destroy();
  console.log('\n[Cleanup] Test records cleaned up.');

  console.log('\n ALL TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
