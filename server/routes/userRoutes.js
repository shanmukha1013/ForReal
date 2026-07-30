const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  followUser,
  unfollowUser,
  updateProfile,
  uploadProfilePicture
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.route('/profile')
  .put(protect, updateProfile);

router.post('/profile-picture', protect, upload.single('avatar'), uploadProfilePicture);

router.route('/:username').get(getUserProfile);
router.post('/:id/follow', protect, followUser);
router.post('/:id/unfollow', protect, unfollowUser);

module.exports = router;
