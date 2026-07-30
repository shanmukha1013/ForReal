const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  unreadCounts: {
    type: Map,
    of: Number,
    default: {} // Keyed by userId, value is count
  }
}, { timestamps: true });

// Index for finding conversations a user is in, sorted by latest activity
conversationSchema.index({ participants: 1, lastActivity: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
