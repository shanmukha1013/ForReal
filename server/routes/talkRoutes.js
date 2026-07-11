const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  createTalk,
  getTalks,
  updateTalk,
  deleteTalk,
  toggleReaction,
  addComment,
  getComments,
  toggleBookmark
} = require('../controllers/talkController');

// All talk routes require authentication
router.use(protect);

router.route('/')
  .post(upload.array('media', 4), createTalk) // Max 4 images
  .get(getTalks);

router.route('/:id')
  .put(updateTalk)
  .delete(deleteTalk);

router.post('/:id/reactions', toggleReaction);
router.post('/:id/bookmarks', toggleBookmark);

router.route('/:id/comments')
  .post(addComment)
  .get(getComments);

module.exports = router;
