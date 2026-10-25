const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['User', 'Moderator', 'Admin'],
      default: 'User',
    },
    profile: {
      displayName: { type: String, default: '', trim: true, maxlength: 50 },
      bio: { type: String, default: '', trim: true, maxlength: 280 },
      avatar: { type: String, default: '' },
      coverImage: { type: String, default: '' },
    },
    stats: {
      talkCount: { type: Number, default: 0 },
      followerCount: { type: Number, default: 0 },
      followingCount: { type: Number, default: 0 },
    },
    refreshToken: { type: String, default: '' },
    // The token replaced by the latest rotation stays valid for a short grace
    // period so concurrent refreshes (e.g. two open tabs) do not sign out.
    previousRefreshToken: { type: String, default: '' },
    refreshRotatedAt: { type: Date },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    credibilityScore: { type: Number, default: 50 },
    logicScore: { type: Number, default: 50 },
    evidenceScore: { type: Number, default: 50 },
    sportsmanshipScore: { type: Number, default: 50 },
    debateStats: {
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      totalVotesReceived: { type: Number, default: 0 }
    },
    badges: [{ type: String }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    privacySettings: {
      allowDMs: { type: String, enum: ['everyone', 'following', 'none'], default: 'following' }
    },
    status: {
      type: String,
      enum: ['Active', 'Suspended', 'Banned'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

module.exports = User;
