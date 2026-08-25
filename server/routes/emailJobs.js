const express = require('express');
const router = express.Router();
const {
  listEmailJobs,
  getEmailJobById,
  cancelJob
} = require('../controllers/emailJobs');
const { authenticateToken, verifyRole } = require('../middlewares/auth');

// List email jobs (Admin/Board only)
router.get('/', authenticateToken, verifyRole('admin', 'board'), listEmailJobs);

// Get specific email job details
router.get('/:id', authenticateToken, verifyRole('admin', 'board'), getEmailJobById);

// Cancel specific email job
router.post('/:id/cancel', authenticateToken, verifyRole('admin', 'board'), cancelJob);

module.exports = router;
