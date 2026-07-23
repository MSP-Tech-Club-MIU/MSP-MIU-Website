const express = require('express');
const router = express.Router();
const {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
} = require('../controllers/departments');
const { authenticateToken, verifyRole } = require('../middlewares/auth');

router.get('/', getDepartments);
router.post('/', authenticateToken, verifyRole('admin', 'board'), createDepartment);
router.put('/:id', authenticateToken, verifyRole('admin', 'board'), updateDepartment);
router.delete('/:id', authenticateToken, verifyRole('admin', 'board'), deleteDepartment);

module.exports = router;
