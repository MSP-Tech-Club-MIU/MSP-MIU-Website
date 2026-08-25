const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getBoard,
  createBoardMember,
  updateBoardMember,
  deleteBoardMember,
  getMyBoardMembership,
  updateMyBoardPhoto,
  sendBoardActivationEmail
} = require('../controllers/board');
const { authenticateToken, verifyRole } = require('../middlewares/auth');

const boardPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype?.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Meet the Board photo must be an image file'), false);
    }
  }
});

router.get('/', getBoard);
router.get('/me', authenticateToken, getMyBoardMembership);
router.put(
  '/me/photo',
  authenticateToken,
  boardPhotoUpload.single('photo'),
  updateMyBoardPhoto
);
router.post('/', authenticateToken, verifyRole('admin', 'board'), createBoardMember);
router.post(
  '/:id/send-activation-email',
  authenticateToken,
  verifyRole('admin', 'board'),
  sendBoardActivationEmail
);
router.put('/:id', authenticateToken, verifyRole('admin', 'board'), updateBoardMember);
router.delete('/:id', authenticateToken, verifyRole('admin', 'board'), deleteBoardMember);

module.exports = router;
