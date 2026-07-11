const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  talk: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Talk',
    required: true,
    index: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  repliesCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Optimizing for fetching comments of a specific talk
commentSchema.index({ talk: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);
