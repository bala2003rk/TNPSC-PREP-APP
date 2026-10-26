const express  = require('express');
const router   = express.Router();
const { protect } = require('../middlewares/error.middleware');
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
} = require('../controllers/profile.controller');

// All profile routes require authentication
router.get('/',               protect, getProfile);
router.patch('/',             protect, updateProfile);
router.post('/avatar',        protect, uploadAvatar);
router.patch('/change-password', protect, changePassword);

module.exports = router;
