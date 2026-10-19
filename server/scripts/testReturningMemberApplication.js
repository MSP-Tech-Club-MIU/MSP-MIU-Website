/**
 * Test Suite: Returning Previous Season Member With Active Account Application Flow
 *
 * Verifies that a previous season member with an active user account:
 * 1. Passes step-0 eligibility check (checkEligibility) with returning_member status.
 * 2. Successfully submits a new application for the new season (createApplication -> 201).
 * 3. Cannot submit duplicate applications within the same season.
 * 4. Is properly enrolled upon application approval (enrollFromApplication):
 *    - Existing User account is reused (no duplicate user row created).
 *    - User account remains active (is_active: 1).
 *    - User password hash is preserved.
 *    - User season_id and department_id are updated to the new season.
 * 5. Is blocked from re-applying once enrolled as a member in the current season.
 * 6. Is skipped for re-activation emails since account is already active.
 * 7. Can still authenticate with original password credentials.
 *
 * Clean rollback / teardown ensures no test data leaks into production.
 *
 * Usage:
 *   node server/scripts/testReturningMemberApplication.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const assert = require('assert');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const {
  sequelize,
  User,
  Member,
  Application,
  Season,
  Department,
  SiteContent
} = require('../models');
const { createApplication, checkEligibility, updateApplicationStatus } = require('../controllers/applications');
const { enrollFromApplication } = require('../utils/memberEnrollment');
const { sendActivationEmailForMember } = require('../utils/activationEmail');
const { generateToken, verifyToken } = require('../utils/jwt');

// Mock Express response helper
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

const TEST_UNI_ID = '2099/07777';
const TEST_EMAIL = 'returning.test2099@miuegypt.edu.eg';
const TEST_PASSWORD = 'SecurePassword123!';

async function cleanupTestData() {
  await Application.destroy({
    where: {
      [Op.or]: [{ university_id: TEST_UNI_ID }, { email: TEST_EMAIL }]
    }
  });
  await Member.destroy({
    where: {
      [Op.or]: [{ university_id: TEST_UNI_ID }, { email: TEST_EMAIL }]
    }
  });
  await User.destroy({
    where: {
      [Op.or]: [{ university_id: TEST_UNI_ID }, { email: TEST_EMAIL }]
    }
  });
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     ${err.stack || err.message}`);
      failed++;
    }
  }

  console.log('\n========================================================================');
  console.log(' MSP-MIU Test: Returning Member with Active Account for New Season');
  console.log('========================================================================\n');

  await sequelize.authenticate();
  await cleanupTestData();

  // 1. Resolve seasons
  const defaultSeason = await Season.findOne({ where: { is_default: 1 } });
  assert.ok(defaultSeason, 'Default (new) season must exist');
  const previousSeason = await Season.findOne({
    where: { season_id: { [Op.ne]: defaultSeason.season_id } },
    order: [['season_id', 'ASC']]
  });
  assert.ok(previousSeason, 'Previous season must exist in database');

  console.log(`Current default season: ${defaultSeason.label} (ID: ${defaultSeason.season_id})`);
  console.log(`Previous season:        ${previousSeason.label} (ID: ${previousSeason.season_id})\n`);

  // 2. Fetch valid departments
  const departments = await Department.findAll({ limit: 5 });
  assert.ok(departments.length >= 2, 'At least 2 departments required for test');
  const prevDeptId = departments[0].department_id;
  const newDeptId = departments[1].department_id;

  // 3. Ensure recruitment is enabled during test
  const recruitmentRow = await SiteContent.findByPk('recruitment');
  const originalRecruitmentValue = recruitmentRow ? recruitmentRow.content_value : null;
  if (recruitmentRow && recruitmentRow.content_value?.enabled === false) {
    await recruitmentRow.update({
      content_value: { ...recruitmentRow.content_value, enabled: true },
    });
  }

  let testUser = null;
  let testPrevMember = null;

  try {
    // ── Setup: Create a Previous Season Active Member & User ──
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    testUser = await User.create({
      full_name: 'Returning Test Member',
      university_id: TEST_UNI_ID,
      email: TEST_EMAIL,
      password_hash: passwordHash,
      role: 'member',
      is_active: true,
      department_id: prevDeptId,
      season_id: previousSeason.season_id,
      score: 100
    });

    testPrevMember = await Member.create({
      university_id: TEST_UNI_ID,
      full_name: 'Returning Test Member',
      email: TEST_EMAIL,
      faculty: 'Computer Science',
      year: 2,
      phone_number: '+201012345678',
      department_id: prevDeptId,
      season_id: previousSeason.season_id,
      user_id: testUser.user_id,
      joined_at: new Date('2025-10-01')
    });

    console.log(`Created baseline test user: ID ${testUser.user_id}, Member ID ${testPrevMember.member_id} (Season ${previousSeason.season_id}, Active: ${testUser.is_active})`);

    console.log('\n--- Part 1: Step-0 Eligibility Check (checkEligibility) ---');

    await test('Case 1.1: Standard checkEligibility returns eligible=true with warning="returning_member"', async () => {
      const res = await invokeController(checkEligibility, {
        body: {
          university_id: TEST_UNI_ID,
          email: TEST_EMAIL,
          full_name: 'Returning Test Member'
        }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.eligible, true);
      assert.strictEqual(res.body.warning, 'returning_member');
      assert.match(res.body.message, /Welcome back/i);
    });

    await test('Case 1.2: checkEligibility with uppercase email and whitespace passes', async () => {
      const res = await invokeController(checkEligibility, {
        body: {
          university_id: `  ${TEST_UNI_ID}  `,
          email: `  ${TEST_EMAIL.toUpperCase()}  `,
          full_name: 'Returning Test Member'
        }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.eligible, true);
      assert.strictEqual(res.body.warning, 'returning_member');
    });

    await test('Case 1.3: checkEligibility with Arabic-Indic numerals in student ID passes', async () => {
      // 2099/07777 in Arabic-Indic numerals
      const arabicId = '٢٠٩٩/٠٧٧٧٧';
      const res = await invokeController(checkEligibility, {
        body: {
          university_id: arabicId,
          email: TEST_EMAIL,
          full_name: 'Returning Test Member'
        }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.eligible, true);
      assert.strictEqual(res.body.warning, 'returning_member');
    });

    await test('Case 1.4: checkEligibility with ONLY university_id passes with returning_member', async () => {
      const res = await invokeController(checkEligibility, {
        body: {
          university_id: TEST_UNI_ID
        }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.eligible, true);
      assert.strictEqual(res.body.warning, 'returning_member');
    });

    await test('Case 1.5: checkEligibility with ONLY email passes with returning_member', async () => {
      const res = await invokeController(checkEligibility, {
        body: {
          email: TEST_EMAIL
        }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.eligible, true);
      assert.strictEqual(res.body.warning, 'returning_member');
    });

    console.log('\n--- Part 2: Application Submission (createApplication) ---');

    let submittedAppId = null;

    await test('Case 2.1: Submitting new season application succeeds with 201 Created', async () => {
      const res = await invokeController(createApplication, {
        body: {
          university_id: TEST_UNI_ID,
          full_name: 'Returning Test Member',
          email: TEST_EMAIL,
          faculty: 'Computer Science',
          year: 3, // Junior now
          phone_number: '+201012345678',
          first_choice: newDeptId,
          second_choice: prevDeptId,
          skills: 'Node.js, React, Cloud Architecture',
          motivation: 'Returning to MSP to lead new technical workshops and mentor new recruits.',
          interview: 'on-campus'
        }
      });

      assert.strictEqual(res.status, 201, `Expected 201 but got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.university_id, TEST_UNI_ID);
      assert.strictEqual(res.body.data.email, TEST_EMAIL.toLowerCase());
      assert.strictEqual(res.body.data.season_id, defaultSeason.season_id);
      assert.strictEqual(res.body.data.status, 'pending');
      assert.strictEqual(res.body.data.first_choice, newDeptId);

      submittedAppId = res.body.data.application_id;
    });

    await test('Case 2.2: Application is persisted in the database scoped to the new season', async () => {
      const app = await Application.findByPk(submittedAppId);
      assert.ok(app);
      assert.strictEqual(app.season_id, defaultSeason.season_id);
      assert.strictEqual(app.university_id, TEST_UNI_ID);
      assert.strictEqual(app.status, 'pending');
    });

    console.log('\n--- Part 3: Duplicate Submission Prevention for the Same Season ---');

    await test('Case 3.1: checkEligibility blocks duplicate application in same season', async () => {
      const res = await invokeController(checkEligibility, {
        body: {
          university_id: TEST_UNI_ID,
          email: TEST_EMAIL,
          full_name: 'Returning Test Member'
        }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.eligible, false);
      assert.strictEqual(res.body.reason, 'pending_application');
    });

    await test('Case 3.2: createApplication rejects duplicate submission for same season with 400', async () => {
      const res = await invokeController(createApplication, {
        body: {
          university_id: TEST_UNI_ID,
          full_name: 'Returning Test Member',
          email: TEST_EMAIL,
          faculty: 'Computer Science',
          year: 3,
          phone_number: '+201012345678',
          first_choice: newDeptId,
          skills: 'Duplicate test',
          motivation: 'Duplicate test',
          interview: 'online'
        }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /already exists for this season/i);
    });

    console.log('\n--- Part 4: Approval & Enrollment (enrollFromApplication) ---');

    await test('Case 4.1: Application approval enrolls member and updates active user without duplicate account', async () => {
      const app = await Application.findByPk(submittedAppId);
      await app.update({ status: 'approved' });

      const enrollment = await enrollFromApplication(app, { departmentId: newDeptId });

      assert.ok(enrollment.member, 'Member record must be returned');
      assert.strictEqual(enrollment.member.season_id, defaultSeason.season_id, 'Member must be in default season');
      assert.strictEqual(enrollment.member.department_id, newDeptId, 'Member must be in new department');
      assert.strictEqual(enrollment.member.user_id, testUser.user_id, 'Member must link to existing User');

      // Reload user from database
      await testUser.reload();
      assert.strictEqual(testUser.season_id, defaultSeason.season_id, 'User season must update to new season');
      assert.strictEqual(testUser.department_id, newDeptId, 'User department must update to new department');
      assert.strictEqual(Number(testUser.is_active), 1, 'User must remain active');

      // Ensure NO duplicate user row was created
      const userCount = await User.count({
        where: {
          [Op.or]: [{ university_id: TEST_UNI_ID }, { email: TEST_EMAIL }]
        }
      });
      assert.strictEqual(userCount, 1, `Exactly 1 user account must exist, but found ${userCount}`);

      // Ensure Member rows exist for both seasons
      const memberCount = await Member.count({
        where: { university_id: TEST_UNI_ID }
      });
      assert.strictEqual(memberCount, 2, `Should have 2 member records (one per season), found ${memberCount}`);
    });

    await test('Case 4.2: Password and credentials remain valid after new season enrollment', async () => {
      await testUser.reload();
      const passwordMatches = await bcrypt.compare(TEST_PASSWORD, testUser.password_hash);
      assert.strictEqual(passwordMatches, true, 'User password must still match');

      const tokenResult = generateToken({
        userId: testUser.user_id,
        email: testUser.email,
        role: testUser.role,
        departmentId: testUser.department_id
      });
      assert.strictEqual(tokenResult.success, true);
      const decoded = verifyToken(tokenResult.token);
      assert.strictEqual(decoded.success, true);
      assert.strictEqual(decoded.decoded.userId, testUser.user_id);
    });

    console.log('\n--- Part 5: Post-Enrollment Guards ---');

    await test('Case 5.1: checkEligibility blocks applicant once already enrolled in current season', async () => {
      const res = await invokeController(checkEligibility, {
        body: {
          university_id: TEST_UNI_ID,
          email: TEST_EMAIL,
          full_name: 'Returning Test Member'
        }
      });
      // Should now report already_member (or approved_application)
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.eligible, false);
      assert.ok(['already_member', 'approved_application'].includes(res.body.reason));
    });

    await test('Case 5.2: createApplication blocks applicant if already enrolled in current season', async () => {
      const res = await invokeController(createApplication, {
        body: {
          university_id: TEST_UNI_ID,
          full_name: 'Returning Test Member',
          email: TEST_EMAIL,
          faculty: 'Computer Science',
          year: 3,
          phone_number: '+201012345678',
          first_choice: newDeptId,
          skills: 'Post-enroll test',
          motivation: 'Post-enroll test',
          interview: 'online'
        }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    console.log('\n--- Part 6: Activation Email Skip Verification ---');

    await test('Case 6.1: sendActivationEmailForMember skips active member without error', async () => {
      const currentMember = await Member.findOne({
        where: { university_id: TEST_UNI_ID, season_id: defaultSeason.season_id }
      });
      assert.ok(currentMember);

      const mockSendEmail = async () => {
        throw new Error('sendEmail should NOT be called for already active user');
      };

      const result = await sendActivationEmailForMember(currentMember, mockSendEmail);
      assert.strictEqual(result.skipped, true);
      assert.match(result.reason, /already active/i);
    });

  } finally {
    // Teardown
    await cleanupTestData();
    if (recruitmentRow && originalRecruitmentValue && originalRecruitmentValue.enabled === false) {
      await recruitmentRow.update({ content_value: originalRecruitmentValue });
    }
    await sequelize.close();
  }

  console.log(`\n========================================================================`);
  console.log(` Test Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
