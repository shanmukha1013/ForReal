const mongoose = require('mongoose');

const talkSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  media: [{
    url: String,
    type: { type: String, enum: ['image', 'video'] },
    width: Number,
    height: Number
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  reactionsCount: {
    like: { type: Number, default: 0 },
    dislike: { type: Number, default: 0 },
    agree: { type: Number, default: 0 },
    disagree: { type: Number, default: 0 }
  },
  commentsCount: {
    type: Number,
    default: 0
  },
  bookmarksCount: {
    type: Number,
    default: 0
  },
  hashtags: [{ type: String, index: true }],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

// Index for feed performance (sorting by latest)
talkSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Talk', talkSchema);
