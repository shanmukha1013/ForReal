const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
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
  },
  type: {
    type: String,
    enum: ['like', 'dislike', 'agree', 'disagree'],
    required: true
  }
}, { timestamps: true });

// Ensure a user can only have one reaction per talk
reactionSchema.index({ user: 1, talk: 1 }, { unique: true });

module.exports = mongoose.model('Reaction', reactionSchema);
