const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  user: {
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
  }
}, { timestamps: true });

// Ensure a user can only bookmark a talk once
bookmarkSchema.index({ user: 1, talk: 1 }, { unique: true });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
