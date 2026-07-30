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
  deleteDebate
} = require('../controllers/debateController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, createDebate)
  .get(getDebates);

router.route('/:id')
  .get(getDebate)
  .delete(protect, deleteDebate);

router.post('/:id/vote', protect, voteOnDebate);
router.route('/:id/comments')
  .get(getDebateComments)
  .post(protect, addDebateComment);

router.route('/:id/comments/:commentId')
  .put(protect, updateDebateComment)
  .delete(protect, deleteDebateComment);

router.route('/:id/comments/:commentId/replies')
  .get(getDebateCommentReplies);

module.exports = router;
