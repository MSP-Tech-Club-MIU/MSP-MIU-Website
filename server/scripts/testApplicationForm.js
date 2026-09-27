/**
 * Comprehensive Test Suite for the Membership Application Form (BecomeMember + /api/applications)
 *
 * Usage:
 *   node --use-system-ca server/scripts/testApplicationForm.js
 *
 * All test database records use temporary university IDs starting with "2099/"
 * and are automatically cleaned up in the `finally` block.
 */

require('dotenv').config();
const assert = require('assert');
const { sequelize, Application, SiteContent, syncModels } = require('../models');
const { createApplication, checkEligibility } = require('../controllers/applications');

const TEST_UNI_IDS = [
  '2099/05074',
  '2099/90001',
  '2099/90002',
  '2099/90003',
  '2099/90004',
  '2099/90005',
];

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

// Mirror of frontend helpers in client/src/pages/BecomeMember.jsx
const TECH_FACULTIES = new Set([
  'Computer Science',
  'Computer Engineering',
  'Engineering Sciences & Arts - ECE',
  'Electronics & Communication Engineering',
]);

function isTechFaculty(faculty) {
  if (!faculty) return false;
  if (TECH_FACULTIES.has(faculty)) return true;
  const f = String(faculty).toLowerCase();
  return f.includes('computer') || f.includes('ece') || f.includes('electronics');
}

function toAsciiDigits(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
}

function normalizePhoneInput(raw) {
  if (!raw) return '';
  const s = toAsciiDigits(raw);
  let digits = s.replace(/\D/g, '');
  if (digits.startsWith('0020')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('20') && digits.length > 10) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0') && digits.length > 1) {
    digits = digits.replace(/^0+/, '');
  }
  return digits.slice(0, 10);
}

function formatStudentIdInput(input) {
  let raw = toAsciiDigits(input).replace(/[^\d/]/g, '');
  if (!raw.includes('/') && raw.length > 4) {
    raw = raw.slice(0, 4) + '/' + raw.slice(4, 9);
  }
  if (raw.length > 10) raw = raw.slice(0, 10);
  return raw;
}

async function cleanupTestApplications() {
  await Application.destroy({
    where: {
      university_id: TEST_UNI_IDS,
    },
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

  console.log('\n============================================================');
  console.log(' MSP-MIU Membership Application Form — Full Scenario Suite');
  console.log('============================================================\n');

  // Ensure DB schema is synced (converts applications.faculty ENUM -> VARCHAR(100))
  await syncModels();
  await cleanupTestApplications();

  // Temporarily ensure recruitment is enabled during test execution if closed
  const recruitmentRow = await SiteContent.findByPk('recruitment');
  const originalRecruitmentValue = recruitmentRow ? recruitmentRow.content_value : null;
  if (recruitmentRow && recruitmentRow.content_value?.enabled === false) {
    await recruitmentRow.update({
      content_value: { ...recruitmentRow.content_value, enabled: true },
    });
  }

  try {
    console.log('--- Part 1: Client-Side Validation & Normalization Scenarios ---');

    await test('Email regex accepts emails containing "s" and uppercase domains', () => {
      const clientEmailRegex = /^[A-Za-z]+\d+@miuegypt\.edu\.eg$/i;
      assert.strictEqual(clientEmailRegex.test('salma2405074@miuegypt.edu.eg'), true);
      assert.strictEqual(clientEmailRegex.test('seif2312345@miuegypt.edu.eg'), true);
      assert.strictEqual(clientEmailRegex.test('Salma2405074@MIUEGYPT.EDU.EG'.trim()), true);
      assert.strictEqual(clientEmailRegex.test('salma2405074@gmail.com'), false);
      assert.strictEqual(clientEmailRegex.test('2405074@miuegypt.edu.eg'), false);
    });

    await test('Phone normalization handles local, +20, 0020, Arabic numerals, and formatting characters', () => {
      assert.strictEqual(normalizePhoneInput('+201550497673'), '1550497673');
      assert.strictEqual(normalizePhoneInput('01550497673'), '1550497673');
      assert.strictEqual(normalizePhoneInput('00201012345678'), '1012345678');
      assert.strictEqual(normalizePhoneInput('201112345678'), '1112345678');
      assert.strictEqual(normalizePhoneInput('٠١٢٣٤٥٦٧٨٩٠'), '1234567890');
      assert.strictEqual(normalizePhoneInput('+20 155-049-7673'), '1550497673');
    });

    await test('University ID auto-formatter handles ASCII and Arabic-Indic digits', () => {
      assert.strictEqual(formatStudentIdInput('202405074'), '2024/05074');
      assert.strictEqual(formatStudentIdInput('2024/05074'), '2024/05074');
      assert.strictEqual(formatStudentIdInput('٢٠٢٤٠٥٠٧٤'), '2024/05074');
      assert.strictEqual(formatStudentIdInput('٢٠٢٤/٠٥٠٧٤'), '2024/05074');
    });

    await test('Tech faculty filter recognizes both CMS and legacy CS/ECE/Computer Engineering names', () => {
      assert.strictEqual(isTechFaculty('Computer Science'), true);
      assert.strictEqual(isTechFaculty('Computer Engineering'), true);
      assert.strictEqual(isTechFaculty('Electronics & Communication Engineering'), true);
      assert.strictEqual(isTechFaculty('Engineering Sciences & Arts - ECE'), true);
      // Non-tech faculties must NOT match
      assert.strictEqual(isTechFaculty('Mass Communication'), false);
      assert.strictEqual(isTechFaculty('Dentistry'), false);
      assert.strictEqual(isTechFaculty('Architecture'), false);
      assert.strictEqual(isTechFaculty('Engineering Sciences & Arts - Architecture'), false);
      assert.strictEqual(isTechFaculty('Pharmacy'), false);
      assert.strictEqual(isTechFaculty('Business'), false);
      assert.strictEqual(isTechFaculty('Business Administration'), false);
      assert.strictEqual(isTechFaculty('Alsun'), false);
    });

    console.log('\n--- Part 2: Backend API & Database Scenarios ---');

    await test('Scenario 1: Step-0 Eligibility check passes for new applicant (Salma scenario)', async () => {
      const res = await invokeController(checkEligibility, {
        body: {
          full_name: 'Salma Mahmoud Abdelaziz',
          email: 'salma2405074@miuegypt.edu.eg',
          university_id: '2099/05074',
        },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.eligible, true);
    });

    await test('Scenario 2: Exact screenshot payload (email with "s", +2015 phone, 2 departments) submits with 201', async () => {
      const res = await invokeController(createApplication, {
        body: {
          university_id: '2099/05074',
          full_name: 'Salma Mahmoud Abdelaziz',
          email: 'salma2405074@miuegypt.edu.eg',
          faculty: 'Computer Science',
          year: 3, // Junior
          phone_number: '+201550497673',
          first_choice: 6, // Event Planning
          second_choice: 3, // Media & Content Creation
          skills: 'Team work , communication, problem solving',
          motivation: 'I want to learn and contribute to MSP Tech Club at MIU.',
          interview: 'on-campus',
        },
      });
      assert.strictEqual(res.status, 201, `Expected 201 but got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.email, 'salma2405074@miuegypt.edu.eg');
      assert.strictEqual(res.body.data.phone_number, '+201550497673');
      assert.strictEqual(res.body.data.first_choice, 6);
      assert.strictEqual(res.body.data.second_choice, 3);
    });

    await test('Scenario 3: Duplicate application in same season is blocked in both checkEligibility and createApplication', async () => {
      const eligRes = await invokeController(checkEligibility, {
        body: {
          full_name: 'Salma Mahmoud Abdelaziz',
          email: 'salma2405074@miuegypt.edu.eg',
          university_id: '2099/05074',
        },
      });
      assert.strictEqual(eligRes.status, 200);
      assert.strictEqual(eligRes.body.eligible, false);
      assert.strictEqual(eligRes.body.reason, 'pending_application');

      const submitRes = await invokeController(createApplication, {
        body: {
          university_id: '2099/05074',
          full_name: 'Salma Mahmoud Abdelaziz',
          email: 'salma2405074@miuegypt.edu.eg',
          faculty: 'Computer Science',
          year: 3,
          phone_number: '+201550497673',
          first_choice: 6,
          second_choice: 3,
          skills: 'Team work',
          motivation: 'Motivation text',
          interview: 'on-campus',
        },
      });
      assert.strictEqual(submitRes.status, 400);
      assert.match(submitRes.body.error, /already exists/i);
    });

    await test('Scenario 4: CMS faculties (Electronics & Communication Engineering, Architecture, Business Administration, Computer Engineering) save without ENUM truncation error', async () => {
      const cmsFaculties = [
        { id: '2099/90001', faculty: 'Electronics & Communication Engineering' },
        { id: '2099/90002', faculty: 'Architecture' },
        { id: '2099/90003', faculty: 'Business Administration' },
        { id: '2099/90004', faculty: 'Computer Engineering' },
      ];

      for (const item of cmsFaculties) {
        const res = await invokeController(createApplication, {
          body: {
            university_id: item.id,
            full_name: 'Test Applicant Name',
            email: `student${item.id.slice(-5)}@miuegypt.edu.eg`,
            faculty: item.faculty,
            year: 2,
            phone_number: '01012345678',
            first_choice: 4,
            second_choice: null,
            skills: 'Leadership and organization',
            motivation: 'Excited to join MSP community',
            interview: 'online',
          },
        });
        assert.strictEqual(
          res.status,
          201,
          `Failed for faculty "${item.faculty}" with status ${res.status}: ${JSON.stringify(res.body)}`
        );
        assert.strictEqual(res.body.data.faculty, item.faculty);
      }
    });

    await test('Scenario 5: Arabic-Indic numerals, uppercase email, surrounding spaces, and duplicate 2nd choice are normalized properly', async () => {
      const res = await invokeController(createApplication, {
        body: {
          university_id: '  ٢٠٩٩/٩٠٠٠٥  ',
          full_name: '  Youssef Hassan Ali  ',
          email: '  Youssef90005@MIUEGYPT.EDU.EG  ',
          faculty: '  Computer Science  ',
          year: '1',
          phone_number: '٠١١١٢٣٤٥٦٧٨',
          first_choice: 1,
          second_choice: 1, // same as first_choice -> should become null
          skills: '  JavaScript, React, Node.js  ',
          motivation: '  Building impactful projects with peers  ',
          interview: '  online  ',
        },
      });
      assert.strictEqual(res.status, 201, `Expected 201 but got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.data.university_id, '2099/90005');
      assert.strictEqual(res.body.data.email, 'youssef90005@miuegypt.edu.eg');
      assert.strictEqual(res.body.data.phone_number, '+201112345678');
      assert.strictEqual(res.body.data.second_choice, null);
    });

    await test('Scenario 6: Invalid inputs (bad email, bad phone, bad university ID, bad interview, whitespace-only fields) return 400 Bad Request', async () => {
      const baseValid = {
        university_id: '2099/99999',
        full_name: 'Valid Student Name',
        email: 'valid99999@miuegypt.edu.eg',
        faculty: 'Computer Science',
        year: 2,
        phone_number: '01012345678',
        first_choice: 1,
        skills: 'Valid skills text',
        motivation: 'Valid motivation text',
        interview: 'on-campus',
      };

      // Invalid email
      const badEmail = await invokeController(createApplication, {
        body: { ...baseValid, email: 'not-an-email' },
      });
      assert.strictEqual(badEmail.status, 400);
      assert.match(badEmail.body.error, /Invalid email format/i);

      // Invalid phone
      const badPhone = await invokeController(createApplication, {
        body: { ...baseValid, phone_number: '01312345678' },
      });
      assert.strictEqual(badPhone.status, 400);
      assert.match(badPhone.body.error, /Invalid phone number/i);

      // Invalid university_id
      const badId = await invokeController(createApplication, {
        body: { ...baseValid, university_id: '///' },
      });
      assert.strictEqual(badId.status, 400);
      assert.match(badId.body.error, /Invalid university ID/i);

      // Invalid interview option
      const badInterview = await invokeController(createApplication, {
        body: { ...baseValid, interview: 'invalid-mode' },
      });
      assert.strictEqual(badInterview.status, 400);
      assert.match(badInterview.body.error, /Invalid interview/i);

      // Whitespace-only skills
      const emptySkills = await invokeController(createApplication, {
        body: { ...baseValid, skills: '    ' },
      });
      assert.strictEqual(emptySkills.status, 400);
      assert.match(emptySkills.body.error, /required fields/i);
    });
  } finally {
    // Restore original recruitment state if modified
    if (recruitmentRow && originalRecruitmentValue && originalRecruitmentValue.enabled === false) {
      await recruitmentRow.update({ content_value: originalRecruitmentValue });
    }
    await cleanupTestApplications();
    await sequelize.close();
  }

  console.log(`\n============================================================`);
  console.log(` Results: ${passed} passed, ${failed} failed`);
  console.log(`============================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
