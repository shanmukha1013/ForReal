const mongoose = require('mongoose');

// One endorsement ("strong point") per user per debate argument.
const argumentEndorsementSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DebateComment',
    required: true,
    index: true
  },
  debate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Debate',
    required: true,
    index: true
  }
}, { timestamps: true });

argumentEndorsementSchema.index({ user: 1, comment: 1 }, { unique: true });

module.exports = mongoose.model('ArgumentEndorsement', argumentEndorsementSchema);
