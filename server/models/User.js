import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-z0-9_]+$/, 'Username can only contain letters, numbers and underscores'],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/.+@.+\..+/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    avatar: {
      type: String,
      default: '',
    },
    coverImage: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: 280,
      default: '',
    },
    website: {
      type: String,
      maxlength: 100,
      default: '',
    },
    location: {
      type: String,
      maxlength: 100,
      default: '',
    },
    credibility: {
      type: Number,
      default: 0,
      index: true,
    },
    stats: {
      posts: { type: Number, default: 0 },
      followers: { type: Number, default: 0 },
      following: { type: Number, default: 0 },
    },
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin'],
      default: 'user',
    },
    verified: { type: Boolean, default: false },
    refreshTokens: {
      type: [String],
      default: []
    },
    followers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: []
    },
    following: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: []
    },
  },
  { timestamps: true }
);

// Password hashing pre-save
UserSchema.pre('save', async function () {
  const user = this;
  if (!user.isModified('password')) return;
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(user.password, salt);
    user.password = hash;
  } catch (err) {
    throw err;
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// toJSON: remove sensitive fields
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

UserSchema.index({ username: 1, displayName: 1 });
const User = mongoose.model('User', UserSchema);

export default User;
