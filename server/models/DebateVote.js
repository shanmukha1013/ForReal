const mongoose = require('mongoose');

const debateVoteSchema = new mongoose.Schema({
  user: {
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
    type: mongoose.Schema.Types.ObjectId, // Refers to the _id of an item in debate.options
    required: true
  }
}, { timestamps: true });

// Ensure a user can only vote once per debate
debateVoteSchema.index({ user: 1, debate: 1 }, { unique: true });

const DebateVote = mongoose.model('DebateVote', debateVoteSchema);

module.exports = DebateVote;
