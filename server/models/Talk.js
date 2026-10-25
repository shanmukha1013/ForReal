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
    // Image-only talks are allowed; text is required otherwise.
    required: function requiredWithoutMedia() {
      return !this.media || this.media.length === 0;
    },
    trim: true,
    maxlength: 2000,
    default: ''
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

// Index for feed performance (sorting by latest) and profile timelines
talkSchema.index({ createdAt: -1 });
talkSchema.index({ author: 1, _id: -1 });

module.exports = mongoose.model('Talk', talkSchema);
