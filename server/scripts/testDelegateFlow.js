/**
 * Integration test for Delegate role:
 * 1. Application status 'accepted_delegate' -> enrolled into 1st choice as 'delegate'
 * 2. Application status 'approved' -> enrolled into 1st choice as 'member'
 * 3. Application status 'accepted_second_choice_delegate' -> enrolled into 2nd choice as 'delegate'
 * 4. Application status 'accepted_second_choice_delegate' without second choice -> 400 error
 * 5. Update member role via updateMember -> updates role and syncs linked User
 * 6. getAllMembers role filtering -> correctly filters by role=delegate and role=member
 * 7. exportMembersToCSV -> CSV includes 'role' column
 */
require('dotenv').config();
const assert = require('assert');
const AdmZip = require('adm-zip');
const { sequelize, Application, Member, User, Season, Department } = require('../models');
const { updateApplicationStatus } = require('../controllers/applications');
const { updateMember, getAllMembers, exportMembersToCSV } = require('../controllers/members');

function invokeController(handler, { body = {}, query = {}, params = {}, user = null } = {}) {
  return new Promise((resolve, reject) => {
    const req = { body, query, params, user };
    let streamChunks = [];
    const res = {
      statusCode: 200,
      headers: {},
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader(name, value) {
        this.headers[name] = value;
      },
      json(data) {
        this.payload = data;
        resolve({ status: this.statusCode, body: data });
        return this;
      },
      send(data) {
        this.payload = data;
        resolve({ status: this.statusCode, body: data, headers: this.headers });
        return this;
      }
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

const TEST_UNI_1 = 'TEST/DEL_1';
const TEST_UNI_2 = 'TEST/DEL_2';
const TEST_UNI_3 = 'TEST/DEL_3';
const TEST_EMAIL_1 = 'test_del_1@miuegypt.edu.eg';
const TEST_EMAIL_2 = 'test_del_2@miuegypt.edu.eg';
const TEST_EMAIL_3 = 'test_del_3@miuegypt.edu.eg';

async function cleanup() {
  await Application.destroy({ where: { university_id: [TEST_UNI_1, TEST_UNI_2, TEST_UNI_3] } });
  await Member.destroy({ where: { university_id: [TEST_UNI_1, TEST_UNI_2, TEST_UNI_3] } });
  await User.destroy({ where: { university_id: [TEST_UNI_1, TEST_UNI_2, TEST_UNI_3] } });
}

async function runTests() {
  console.log('--- Starting Delegate Flow Verification Tests ---');

  await sequelize.authenticate();
  await cleanup();

  const mockAdminUser = {
    user_id: 1,
    role: 'admin',
    full_name: 'Test Admin'
  };

  // Find or create active season and departments
  let season = await Season.findOne({ where: { is_active: true } });
  if (!season) {
    season = await Season.findOne();
  }
  assert(season, 'A season must exist in the database');

  const departments = await Department.findAll({ limit: 2 });
  assert(departments.length >= 2, 'At least 2 departments must exist in the database');
  const dept1Id = departments[0].department_id;
  const dept2Id = departments[1].department_id;

  try {
    // -------------------------------------------------------------
    // Test 1: Application -> 'accepted_delegate' (1st choice, role: delegate)
    // -------------------------------------------------------------
    console.log('Test 1: Accept application as delegate in 1st choice...');
    const app1 = await Application.create({
      university_id: TEST_UNI_1,
      full_name: 'Delegate Candidate One',
      email: TEST_EMAIL_1,
      faculty: 'Computer Science',
      year: 3,
      phone_number: '01011111111',
      first_choice: dept1Id,
      second_choice: dept2Id,
      skills: 'Leadership and technical architecture',
      motivation: 'Want to guide junior members as a delegate',
      interview: 'on-campus',
      status: 'pending',
      season_id: season.season_id
    });

    const res1 = await invokeController(updateApplicationStatus, {
      params: { id: app1.application_id },
      body: { status: 'accepted_delegate' },
      user: mockAdminUser
    });

    assert.strictEqual(res1.status, 200, `Expected 200, got ${res1.status}`);
    assert.strictEqual(res1.body.success, true);
    assert.strictEqual(res1.body.data.status, 'accepted_delegate');
    assert.strictEqual(res1.body.data.role, 'delegate');
    assert.strictEqual(res1.body.data.department_id, dept1Id);

    const enrolledMember1 = await Member.findByPk(res1.body.data.member_id);
    assert(enrolledMember1, 'Member record must exist');
    assert.strictEqual(enrolledMember1.role, 'delegate', 'Member role must be delegate');
    assert.strictEqual(enrolledMember1.department_id, dept1Id, 'Member department must be first choice');
    console.log('✓ Test 1 passed: Application accepted as delegate enrolls with role: delegate in 1st choice.');

    // -------------------------------------------------------------
    // Test 2: Application -> 'approved' (1st choice, role: member)
    // -------------------------------------------------------------
    console.log('Test 2: Accept application as standard member (approved)...');
    const app2 = await Application.create({
      university_id: TEST_UNI_2,
      full_name: 'Member Candidate Two',
      email: TEST_EMAIL_2,
      faculty: 'Business',
      year: 2,
      phone_number: '01022222222',
      first_choice: dept2Id,
      second_choice: dept1Id,
      skills: 'Marketing and operations',
      motivation: 'Eager to learn',
      interview: 'online',
      status: 'pending',
      season_id: season.season_id
    });

    const res2 = await invokeController(updateApplicationStatus, {
      params: { id: app2.application_id },
      body: { status: 'approved' },
      user: mockAdminUser
    });

    assert.strictEqual(res2.status, 200, `Expected 200, got ${res2.status}`);
    assert.strictEqual(res2.body.data.status, 'approved');
    assert.strictEqual(res2.body.data.role, 'member');
    assert.strictEqual(res2.body.data.department_id, dept2Id);

    const enrolledMember2 = await Member.findByPk(res2.body.data.member_id);
    assert(enrolledMember2, 'Member record must exist');
    assert.strictEqual(enrolledMember2.role, 'member', 'Member role must be member');
    assert.strictEqual(enrolledMember2.department_id, dept2Id, 'Member department must be first choice');
    console.log('✓ Test 2 passed: Standard approval enrolls member with role: member.');

    // -------------------------------------------------------------
    // Test 3: Application -> 'accepted_second_choice_delegate' (2nd choice, role: delegate)
    // -------------------------------------------------------------
    console.log('Test 3: Accept application as delegate in 2nd choice...');
    const app3 = await Application.create({
      university_id: TEST_UNI_3,
      full_name: 'Delegate Candidate Three',
      email: TEST_EMAIL_3,
      faculty: 'Computer Science',
      year: 4,
      phone_number: '01033333333',
      first_choice: dept1Id,
      second_choice: dept2Id,
      skills: 'Design & Frontend coordination',
      motivation: 'Want to be a department delegate',
      interview: 'on-campus',
      status: 'pending',
      season_id: season.season_id
    });

    const res3 = await invokeController(updateApplicationStatus, {
      params: { id: app3.application_id },
      body: { status: 'accepted_second_choice_delegate' },
      user: mockAdminUser
    });

    assert.strictEqual(res3.status, 200, `Expected 200, got ${res3.status}`);
    assert.strictEqual(res3.body.data.status, 'accepted_second_choice_delegate');
    assert.strictEqual(res3.body.data.role, 'delegate');
    assert.strictEqual(res3.body.data.department_id, dept2Id);

    const enrolledMember3 = await Member.findByPk(res3.body.data.member_id);
    assert(enrolledMember3, 'Member record must exist');
    assert.strictEqual(enrolledMember3.role, 'delegate', 'Member role must be delegate');
    assert.strictEqual(enrolledMember3.department_id, dept2Id, 'Member department must be 2nd choice');
    console.log('✓ Test 3 passed: Accepted as delegate in 2nd choice enrolls into 2nd choice with role: delegate.');

    // -------------------------------------------------------------
    // Test 4: 'accepted_second_choice_delegate' without second choice -> 400
    // -------------------------------------------------------------
    console.log('Test 4: Validate 2nd choice requirement for delegate...');
    const appNoSecond = await Application.create({
      university_id: 'TEST/NO_SEC',
      full_name: 'No Second Choice Applicant',
      email: 'no_sec@miuegypt.edu.eg',
      faculty: 'Pharmacy',
      year: 1,
      phone_number: '01044444444',
      first_choice: dept1Id,
      second_choice: null,
      skills: 'None',
      motivation: 'None',
      interview: 'online',
      status: 'pending',
      season_id: season.season_id
    });

    const res4 = await invokeController(updateApplicationStatus, {
      params: { id: appNoSecond.application_id },
      body: { status: 'accepted_second_choice_delegate' },
      user: mockAdminUser
    });
    assert.strictEqual(res4.status, 400, 'Expected 400 when second_choice is missing');
    await appNoSecond.destroy();
    console.log('✓ Test 4 passed: Correctly rejected status change without second choice.');

    // -------------------------------------------------------------
    // Test 5: updateMember role promotion/demotion and linked User sync
    // -------------------------------------------------------------
    console.log('Test 5: Member profile edit: role change & User role sync...');
    // Create linked user for member 2
    const linkedUser2 = await User.create({
      university_id: TEST_UNI_2,
      full_name: 'Member Candidate Two',
      email: TEST_EMAIL_2,
      role: 'member',
      department_id: dept2Id,
      season_id: season.season_id
    });
    await enrolledMember2.update({ user_id: linkedUser2.user_id });

    // Promote member 2 to delegate
    const res5 = await invokeController(updateMember, {
      params: { id: enrolledMember2.member_id },
      body: { role: 'delegate' },
      user: mockAdminUser
    });
    assert.strictEqual(res5.status, 200);
    assert.strictEqual(res5.body.data.role, 'delegate');

    await linkedUser2.reload();
    assert.strictEqual(linkedUser2.role, 'delegate', 'Linked User role must sync to delegate');
    console.log('✓ Test 5 passed: Updating member role syncs linked User account role.');

    // -------------------------------------------------------------
    // Test 6: getAllMembers role filtering
    // -------------------------------------------------------------
    console.log('Test 6: Filter members by role...');
    const resFilterDelegate = await invokeController(getAllMembers, {
      query: { role: 'delegate', season_id: season.season_id }
    });
    assert.strictEqual(resFilterDelegate.status, 200);
    assert(resFilterDelegate.body.data.length >= 2, 'Should return at least 2 delegates');
    resFilterDelegate.body.data.forEach(m => {
      assert.strictEqual(m.role, 'delegate', 'Filtered members must all be delegates');
    });

    const resFilterMember = await invokeController(getAllMembers, {
      query: { role: 'member', season_id: season.season_id }
    });
    assert.strictEqual(resFilterMember.status, 200);
    resFilterMember.body.data.forEach(m => {
      assert.strictEqual(m.role, 'member', 'Filtered members must all be members');
    });
    console.log('✓ Test 6 passed: Role filtering in getAllMembers works correctly.');

    // -------------------------------------------------------------
    // Test 7: exportMembersToCSV includes role column
    // -------------------------------------------------------------
    console.log('Test 7: Export members CSV with role column...');
    const resCsv = await invokeController(exportMembersToCSV, {
      query: { season_id: season.season_id }
    });
    assert.strictEqual(resCsv.status, 200);
    assert(resCsv.body instanceof Buffer, 'Response body must be zip buffer');
    const zip = new AdmZip(resCsv.body);
    const zipEntries = zip.getEntries();
    assert(zipEntries.length > 0, 'Zip must have faculty CSV files');
    const firstCsv = zip.readAsText(zipEntries[0]);
    assert(firstCsv.includes('role'), 'CSV header must include role');
    console.log('✓ Test 7 passed: CSV export contains the role column.');

    console.log('\n==========================================');
    console.log('ALL DELEGATE TESTS PASSED SUCCESSFULLY!');
    console.log('==========================================');
  } finally {
    await cleanup();
    await sequelize.close();
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
