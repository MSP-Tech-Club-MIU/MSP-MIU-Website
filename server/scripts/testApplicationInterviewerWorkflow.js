/**
 * Test Suite for Application Interviewer Workflow:
 * - Mark application as "being interviewed by x"
 * - Update status (e.g., approved/rejected) and verify it automatically becomes "interviewed by x"
 * - Clear interviewer
 * - Clean up test data
 *
 * Usage:
 *   node --use-system-ca server/scripts/testApplicationInterviewerWorkflow.js
 */

require('dotenv').config();
const assert = require('assert');
const { sequelize, Application, Department, User } = require('../models');
const {
  updateApplicationStatus,
  updateApplicationInterviewer
} = require('../controllers/applications');

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

const TEST_UNI_ID = '2099/99999';

async function cleanup() {
  await Application.destroy({
    where: { university_id: TEST_UNI_ID }
  });
}

async function runTests() {
  console.log('--- Starting Application Interviewer Workflow Tests ---');

  try {
    await cleanup();

    // Find or fallback department
    const dept = await Department.findOne();
    const deptId = dept ? dept.department_id : 1;

    // 1. Create a dummy application
    const app = await Application.create({
      university_id: TEST_UNI_ID,
      full_name: 'Test Applicant',
      email: 'test_interview_applicant@example.com',
      faculty: 'Computer Science',
      year: 2,
      phone_number: '+201012345678',
      first_choice: deptId,
      skills: 'JavaScript, React, Node.js',
      motivation: 'Passionate about web development and tech education',
      interview: 'on-campus',
      status: 'pending'
    });

    const appId = app.application_id;
    console.log(`✓ Test application created with ID: ${appId}`);

    // Find existing board user or first user
    const existingUser = await User.findOne({ where: { role: 'board' } }) || await User.findOne();
    const boardUser = {
      user_id: existingUser ? existingUser.user_id : null,
      full_name: 'Ahmed Board Member',
      role: 'board',
      department_id: 5
    };

    // 2. Mark as being interviewed by Ahmed Board Member
    console.log('Testing marking as being interviewed...');
    const interviewRes = await invokeController(updateApplicationInterviewer, {
      params: { id: appId },
      body: {
        interview_status: 'being_interviewed',
        interviewer_name: 'Ahmed Board Member'
      },
      user: boardUser
    });

    assert.strictEqual(interviewRes.status, 200, 'Expected HTTP 200 for interview status update');
    assert.strictEqual(interviewRes.body.data.interview_status, 'being_interviewed');
    assert.strictEqual(interviewRes.body.data.interviewer_name, 'Ahmed Board Member');
    console.log('✓ Successfully set to "being_interviewed" by "Ahmed Board Member"');

    // Verify in database
    const dbApp1 = await Application.findByPk(appId);
    assert.strictEqual(dbApp1.interview_status, 'being_interviewed');
    assert.strictEqual(dbApp1.interviewer_name, 'Ahmed Board Member');
    console.log('✓ Database verified: application is being interviewed');

    // 3. Update application status to "approved" (or "rejected")
    // Should AUTOMATICALLY transition interview_status from "being_interviewed" to "interviewed"
    console.log('Testing status update transition to "interviewed by x"...');
    const statusRes = await invokeController(updateApplicationStatus, {
      params: { id: appId },
      body: { status: 'approved' },
      user: boardUser
    });

    assert.strictEqual(statusRes.status, 200, 'Expected HTTP 200 for status update');
    assert.strictEqual(statusRes.body.data.status, 'approved');
    assert.strictEqual(statusRes.body.data.interview_status, 'interviewed');
    assert.strictEqual(statusRes.body.data.interviewer_name, 'Ahmed Board Member');
    console.log('✓ Status update automatically transitioned interview_status to "interviewed" by "Ahmed Board Member"');

    // Verify in database
    const dbApp2 = await Application.findByPk(appId);
    assert.strictEqual(dbApp2.status, 'approved');
    assert.strictEqual(dbApp2.interview_status, 'interviewed');
    assert.strictEqual(dbApp2.interviewer_name, 'Ahmed Board Member');
    console.log('✓ Database verified: application status is approved and interview_status is interviewed');

    // 4. Test clearing interviewer
    console.log('Testing clearing interviewer...');
    const clearRes = await invokeController(updateApplicationInterviewer, {
      params: { id: appId },
      body: { interview_status: null },
      user: boardUser
    });

    assert.strictEqual(clearRes.status, 200);
    assert.strictEqual(clearRes.body.data.interview_status, null);
    assert.strictEqual(clearRes.body.data.interviewer_name, null);

    const dbApp3 = await Application.findByPk(appId);
    assert.strictEqual(dbApp3.interview_status, null);
    assert.strictEqual(dbApp3.interviewer_name, null);
    console.log('✓ Successfully cleared interviewer');

    console.log('\n--- ALL APPLICATION INTERVIEWER WORKFLOW TESTS PASSED ---');
  } finally {
    await cleanup();
    console.log('✓ Cleanup completed');
  }
}

runTests().then(() => process.exit(0)).catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
