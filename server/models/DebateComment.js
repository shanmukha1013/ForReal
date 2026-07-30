const mongoose = require('mongoose');

const debateCommentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  debate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Debate',
    required: true,
    index: true
  },
  optionId: {
    type: mongoose.Schema.Types.ObjectId, // Which side they are arguing for (if any)
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  media: [{
    url: String,
    type: { type: String, enum: ['image', 'video'] }
  }],
  references: [{
    url: String,
    title: String
  }],
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DebateComment',
    default: null
  },
  repliesCount: {
    type: Number,
    default: 0
  },
  reactionsCount: {
    like: { type: Number, default: 0 },
    dislike: { type: Number, default: 0 },
    agree: { type: Number, default: 0 },
    disagree: { type: Number, default: 0 }
  },
  credibilityWeight: {
    type: Number,
    default: 1.0 // Multiplier based on author's credibility score at time of posting
  },
  isAiVerified: {
    type: Boolean,
    default: false
  },
  factCheckScore: {
    type: Number,
    default: 0 // 0-100
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isHighlighted: {
    type: Boolean,
    default: false
  },
  isEdited: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const DebateComment = mongoose.model('DebateComment', debateCommentSchema);

module.exports = DebateComment;
