require('dotenv').config();
const { DirectEmail, User } = require('../models');
const {
  listEmails,
  getEmailById,
  toggleStar,
  deleteEmail,
  restoreEmail,
  saveDraft,
  searchRecipients,
  getMailStatus
} = require('../controllers/webmail');

function createMockRes() {
  return {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    }
  };
}

async function runTests() {
  console.log('--- STARTING WEBMAIL INTEGRATION TESTS ---');

  // 1. Test getMailStatus
  console.log('\n[TEST 1] Testing getMailStatus...');
  const res1 = createMockRes();
  await getMailStatus({}, res1);
  console.log('Status code:', res1.statusCode);
  console.log('SMTP status:', res1.data?.status);
  if (res1.statusCode !== 200 || !res1.data?.status?.isReady) {
    throw new Error('getMailStatus failed or SMTP is not ready');
  }

  // 2. Test saving a draft
  console.log('\n[TEST 2] Testing saveDraft...');
  const req2 = {
    user: { user_id: 1, full_name: 'Test Admin', email: 'test@msp-miu.tech' },
    body: {
      to: 'recipient@example.com',
      cc: 'team@msp-miu.tech',
      subject: 'Test Integration Draft Email',
      body: 'Hello, this is a test draft message body.'
    }
  };
  const res2 = createMockRes();
  await saveDraft(req2, res2);
  console.log('saveDraft response:', res2.statusCode, res2.data?.data?.email_id);
  const draftId = res2.data?.data?.email_id;
  if (!draftId) throw new Error('saveDraft did not return email_id');

  // 3. Test listEmails in 'drafts' folder
  console.log('\n[TEST 3] Testing listEmails in drafts folder...');
  const req3 = { query: { folder: 'drafts', page: 1, limit: 10 } };
  const res3 = createMockRes();
  await listEmails(req3, res3);
  console.log('listEmails drafts count:', res3.data?.counts?.drafts, 'returned:', res3.data?.emails?.length);
  if (res3.data?.counts?.drafts < 1) throw new Error('Draft count should be >= 1');

  // 4. Test getEmailById
  console.log('\n[TEST 4] Testing getEmailById...');
  const req4 = { params: { id: draftId } };
  const res4 = createMockRes();
  await getEmailById(req4, res4);
  console.log('getEmailById subject:', res4.data?.data?.subject);
  if (res4.data?.data?.email_id !== draftId) throw new Error('getEmailById returned wrong email');

  // 5. Test toggleStar
  console.log('\n[TEST 5] Testing toggleStar...');
  const req5 = { params: { id: draftId } };
  const res5 = createMockRes();
  await toggleStar(req5, res5);
  console.log('Starred status:', res5.data?.is_starred);
  if (res5.data?.is_starred !== true) throw new Error('toggleStar should be true');

  // 6. Test searchRecipients
  console.log('\n[TEST 6] Testing searchRecipients...');
  const req6 = { query: { q: 'admin' } };
  const res6 = createMockRes();
  await searchRecipients(req6, res6);
  console.log('Recipients found:', res6.data?.contacts?.length);

  // 7. Test deleteEmail (move to trash)
  console.log('\n[TEST 7] Testing deleteEmail (trash)...');
  const req7 = { params: { id: draftId }, query: { permanent: 'false' } };
  const res7 = createMockRes();
  await deleteEmail(req7, res7);
  console.log('Move to trash response:', res7.data?.message);
  if (res7.data?.is_trash !== true) throw new Error('is_trash should be true');

  // 8. Test restoreEmail
  console.log('\n[TEST 8] Testing restoreEmail...');
  const req8 = { params: { id: draftId } };
  const res8 = createMockRes();
  await restoreEmail(req8, res8);
  console.log('Restore response:', res8.data?.message);
  if (res8.data?.is_trash !== false) throw new Error('is_trash should be false after restore');

  // 9. Clean up test record permanently
  console.log('\n[TEST 9] Permanently deleting test record...');
  const req9 = { params: { id: draftId }, query: { permanent: 'true' } };
  const res9 = createMockRes();
  await deleteEmail(req9, res9);
  console.log('Permanent delete response:', res9.data?.message);

  console.log('\n✅ ALL WEBMAIL TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ WEBMAIL TEST FAILED:', err);
  process.exit(1);
});
