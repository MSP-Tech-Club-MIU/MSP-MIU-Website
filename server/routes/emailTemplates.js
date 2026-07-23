const express = require('express');
const router = express.Router();
const {
  listEmailTemplates,
  getEmailTemplate,
  updateEmailTemplate,
  resetEmailTemplate,
  sendTestEmail,
  listDepartmentWhatsApp,
  updateDepartmentWhatsApp,
  sendMemberActivation,
  sendBoardActivation,
  sendMemberAcceptance
} = require('../controllers/emailTemplates');
const { authenticateToken, verifyRole } = require('../middlewares/auth');

const adminBoard = [authenticateToken, verifyRole('admin', 'board')];

router.get('/', ...adminBoard, listEmailTemplates);
router.get('/departments/whatsapp', ...adminBoard, listDepartmentWhatsApp);
router.put('/departments/:id/whatsapp', ...adminBoard, updateDepartmentWhatsApp);
router.post('/send/member-activation', ...adminBoard, sendMemberActivation);
router.post('/send/board-activation', ...adminBoard, sendBoardActivation);
router.post('/send/member-acceptance', ...adminBoard, sendMemberAcceptance);
router.get('/:key', ...adminBoard, getEmailTemplate);
router.put('/:key', ...adminBoard, updateEmailTemplate);
router.post('/:key/reset', ...adminBoard, resetEmailTemplate);
router.post('/:key/test', ...adminBoard, sendTestEmail);

module.exports = router;
