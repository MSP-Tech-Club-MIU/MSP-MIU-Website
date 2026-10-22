/**
 * Verification test for:
 * 1. Application status 'accepted_second_choice' (enrolling into second choice department)
 * 2. Application status 'accepted_second_choice' without second choice (returns 400)
 * 3. Member profile editing via updateMember and user sync
 */
require('dotenv').config();
const assert = require('assert');
const { sequelize, Application, Member, User, Season, Department } = require('../models');
const { updateApplicationStatus } = require('../controllers/applications');
const { updateMember } = require('../controllers/members');

function invokeController(handler, { body = {}, query = {}, params = {}, user = null } = {}) {
  return new Promise((resolve, reject) => {
    const req = { body, query, params, user };
    const res = {
      statusCode: 200,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.payload = data;
        resolve({ status: this.statusCode, body: data });
        return this;
      },
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

const TEST_UNI_ID_1 = 'TEST/SEC_CHOICE_1';
const TEST_UNI_ID_2 = 'TEST/SEC_CHOICE_2';
const TEST_EMAIL_1 = 'test_sec_1@miuegypt.edu.eg';
const TEST_EMAIL_2 = 'test_sec_2@miuegypt.edu.eg';

async function cleanup() {
  await Application.destroy({
    where: { university_id: [TEST_UNI_ID_1, TEST_UNI_ID_2] }
  });
  await Member.destroy({
    where: { university_id: [TEST_UNI_ID_1, TEST_UNI_ID_2] }
  });
  await User.destroy({
    where: { university_id: [TEST_UNI_ID_1, TEST_UNI_ID_2] }
  });
}

async function runTests() {
  console.log('--- Starting Tests for Second Choice Status & Member Profile Editing ---');

  await sequelize.authenticate();
  await cleanup();

  const mockAdminUser = {
    user_id: 1,
    role: 'admin',
    full_name: 'Test Admin'
  };

  const defaultSeason = await Season.findOne({ where: { is_default: true } });
  const seasonId = defaultSeason ? defaultSeason.season_id : null;

  // Fetch two distinct departments
  const depts = await Department.findAll({ limit: 2 });
  assert(depts.length >= 2, 'Need at least 2 departments for test');
  const dept1 = depts[0].department_id;
  const dept2 = depts[1].department_id;

  // TEST 1: Application with second_choice -> status update to accepted_second_choice
  console.log('\n[TEST 1] Application accepted in second option');
  const app1 = await Application.create({
    university_id: TEST_UNI_ID_1,
    full_name: 'Second Option Student',
    email: TEST_EMAIL_1,
    faculty: 'Computer Science',
    year: 2,
    phone_number: '01012345678',
    first_choice: dept1,
    second_choice: dept2,
    skills: 'JavaScript, React',
    motivation: 'Love coding',
    interview: 'on-campus',
    status: 'pending',
    season_id: seasonId
  });

  const res1 = await invokeController(updateApplicationStatus, {
    params: { id: app1.application_id },
    body: { status: 'accepted_second_choice' },
    user: mockAdminUser
  });

  assert.strictEqual(res1.status, 200, `Expected 200, got ${res1.status}: ${JSON.stringify(res1.body)}`);
  assert.strictEqual(res1.body.success, true);
  assert.strictEqual(res1.body.data.status, 'accepted_second_choice');

  // Verify created member has department_id = dept2 (second choice)
  const member1 = await Member.findOne({
    where: { university_id: TEST_UNI_ID_1 }
  });
  assert(member1, 'Member record must be created');
  assert.strictEqual(member1.department_id, dept2, `Member must be enrolled in second choice (dept ${dept2}), got ${member1.department_id}`);
  console.log('✓ Successfully accepted application in second choice and enrolled into department', dept2);

  // TEST 2: Application without second_choice -> status update to accepted_second_choice should fail (400)
  console.log('\n[TEST 2] Application without second choice attempting accepted_second_choice');
  const app2 = await Application.create({
    university_id: TEST_UNI_ID_2,
    full_name: 'No Second Choice Student',
    email: TEST_EMAIL_2,
    faculty: 'Computer Science',
    year: 1,
    phone_number: '01098765432',
    first_choice: dept1,
    second_choice: null,
    skills: 'Design',
    motivation: 'Love design',
    interview: 'on-campus',
    status: 'pending',
    season_id: seasonId
  });

  const res2 = await invokeController(updateApplicationStatus, {
    params: { id: app2.application_id },
    body: { status: 'accepted_second_choice' },
    user: mockAdminUser
  });

  assert.strictEqual(res2.status, 400, `Expected 400 Bad Request, got ${res2.status}`);
  assert.strictEqual(res2.body.success, false);
  console.log('✓ Rejected status change to accepted_second_choice when second_choice is null (400)');

  // TEST 3: Edit member profile using updateMember
  console.log('\n[TEST 3] Admin edit member profile');
  // First create a linked User for member1 to test user sync
  const user1 = await User.create({
    university_id: TEST_UNI_ID_1,
    full_name: 'Second Option Student',
    email: TEST_EMAIL_1,
    role: 'member',
    department_id: dept2,
    season_id: seasonId
  });
  await member1.update({ user_id: user1.user_id });

  const res3 = await invokeController(updateMember, {
    params: { id: member1.member_id },
    body: {
      full_name: 'Updated Member Name',
      phone_number: '01199998888',
      year: 3,
      department_id: dept1,
      faculty: 'Business'
    },
    user: mockAdminUser
  });

  assert.strictEqual(res3.status, 200, `Expected 200, got ${res3.status}: ${JSON.stringify(res3.body)}`);
  assert.strictEqual(res3.body.data.full_name, 'Updated Member Name');
  assert.strictEqual(res3.body.data.phone_number, '01199998888');
  assert.strictEqual(res3.body.data.year, 3);
  assert.strictEqual(res3.body.data.department_id, dept1);
  assert.strictEqual(res3.body.data.faculty, 'Business');

  // Verify sync to User
  await user1.reload();
  assert.strictEqual(user1.full_name, 'Updated Member Name', 'Linked User full_name must sync');
  assert.strictEqual(user1.department_id, dept1, 'Linked User department_id must sync');
  console.log('✓ Successfully updated member profile and verified linked User account synchronization');

  console.log('\n--- All Tests Passed Successfully! ---');
  await cleanup();
}

runTests()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Test failed:', err);
    await cleanup().catch(() => {});
    process.exit(1);
  });
