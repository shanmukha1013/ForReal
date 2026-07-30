const express = require('express');
const router = express.Router();
const {
  createDebate,
  getDebates,
  getDebate,
  voteOnDebate,
  addDebateComment
} = require('../controllers/debateController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, createDebate)
  .get(getDebates);

router.route('/:id')
  .get(getDebate);

router.post('/:id/vote', protect, voteOnDebate);
router.post('/:id/comments', protect, addDebateComment);

module.exports = router;
