const express = require('express');
const router = express.Router();
const {
  getAndroidApp,
  publishAndroidAppUpdate,
  notifyAndroidAppUpdate
} = require('../controllers/androidApp');
const { authenticateToken } = require('../middlewares/auth');
const { adminAuth } = require('../middlewares/adminAuth');
const { apkUpload } = require('../middlewares/multer');

router.get('/', getAndroidApp);

router.post(
  '/publish',
  authenticateToken,
  adminAuth,
  (req, res, next) => {
    apkUpload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: err.message || 'APK upload failed'
        });
      }
      return next();
    });
  },
  publishAndroidAppUpdate
);

router.post('/notify', authenticateToken, adminAuth, notifyAndroidAppUpdate);

module.exports = router;
