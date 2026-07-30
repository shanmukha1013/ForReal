const mongoose = require('mongoose');

const debateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  rules: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  tags: [{ type: String, trim: true, index: true }],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  options: [{
    label: { type: String, required: true },
    color: { type: String, default: '#00C8FF' },
    votes: { type: Number, default: 0 }
  }],
  status: {
    type: String,
    enum: ['draft', 'live', 'ending_soon', 'voting', 'ai_analysis', 'finished', 'archived'],
    default: 'live',
    index: true
  },
  lifecycle: {
    startedAt: { type: Date, default: Date.now },
    endsAt: { type: Date, required: true },
    finishedAt: { type: Date }
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'invite_only', 'anonymous'],
    default: 'public'
  },
  settings: {
    aiModeration: { type: Boolean, default: true },
    factChecking: { type: Boolean, default: true },
    evidenceRequired: { type: Boolean, default: false },
    maxParticipants: { type: Number, default: 0 }, // 0 = unlimited
    allowAnonymous: { type: Boolean, default: false }
  },
  stats: {
    totalVotes: { type: Number, default: 0 },
    totalComments: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    participantCount: { type: Number, default: 0 }
  },
  aiAnalysis: {
    summary: { type: String, default: '' },
    keyArguments: [{ type: String }],
    strongestEvidence: [{ type: String }],
    logicalFallacies: [{ type: String }],
    biasScore: { type: Number, default: 0 },
    sentimentScore: { type: Number, default: 0 },
    consensusLevel: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
  },
  finalVerdict: {
    winningOptionId: { type: mongoose.Schema.Types.ObjectId },
    aiVerdict: { type: String, default: '' },
    communityVerdict: { type: String, default: '' },
    confidence: { type: Number, default: 0 },
    generatedAt: { type: Date }
  },
  timeline: [{
    type: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    timestamp: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed }
  }],
  media: [{
    url: String,
    type: { type: String, enum: ['image', 'video'] },
    width: Number,
    height: Number
  }],
  referenceLinks: [{
    url: String,
    title: String
  }]
}, { timestamps: true });

debateSchema.index({ 'lifecycle.endsAt': 1 });

const Debate = mongoose.model('Debate', debateSchema);

module.exports = Debate;
