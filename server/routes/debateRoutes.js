const express = require('express');
const router = express.Router();
const {
  createDebate,
  getDebates,
  getDebate,
  voteOnDebate,
  addDebateComment,
  getDebateComments,
  getDebateCommentReplies,
  updateDebateComment,
  deleteDebateComment,
  deleteDebate,
  endorseArgument,
  getUserArguments,
} = require('../controllers/debateController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, createDebate)
  .get(getDebates);

router.get('/arguments/by/:username', getUserArguments);

router.route('/:id')
  .get(optionalAuth, getDebate)
  .delete(protect, deleteDebate);

router.post('/:id/vote', protect, voteOnDebate);

router.route('/:id/comments')
  .get(optionalAuth, getDebateComments)
  .post(protect, addDebateComment);

router.route('/:id/comments/:commentId')
  .put(protect, updateDebateComment)
  .delete(protect, deleteDebateComment);

router.get('/:id/comments/:commentId/replies', optionalAuth, getDebateCommentReplies);
router.post('/:id/comments/:commentId/endorse', protect, endorseArgument);

module.exports = router;
