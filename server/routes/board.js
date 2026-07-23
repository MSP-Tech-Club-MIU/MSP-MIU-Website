const express = require('express');
const router = express.Router();
const {
  getBoard,
  createBoardMember,
  updateBoardMember,
  deleteBoardMember
} = require('../controllers/board');
const { authenticateToken, verifyRole } = require('../middlewares/auth');

router.get('/', getBoard);
router.post('/', authenticateToken, verifyRole('admin', 'board'), createBoardMember);
router.put('/:id', authenticateToken, verifyRole('admin', 'board'), updateBoardMember);
router.delete('/:id', authenticateToken, verifyRole('admin', 'board'), deleteBoardMember);

module.exports = router;
