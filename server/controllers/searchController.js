const User = require('../models/User');
const Debate = require('../models/Debate');
const Talk = require('../models/Talk');
const { successResponse } = require('../utils/apiResponse');
const { syncAllDebates } = require('../services/debateLifecycle');
const { asString, clampInt, escapeRegex } = require('../utils/validators');

// @desc    Global search for people, debates and (when signed in) talks
// @route   GET /api/search?q=&type=users|debates|talks
// @access  Public (talks require sign-in)
const globalSearch = async (req, res, next) => {
  try {
    const q = asString(req.query.q).trim().slice(0, 80);
    const type = asString(req.query.type);
    const limit = clampInt(req.query.limit, { fallback: 10, max: 20 });

    if (!q) {
      return successResponse(res, 200, 'Empty search', { users: [], debates: [], talks: [] });
    }

    // User input is escaped so it is matched literally (no ReDoS, no regex injection).
    const pattern = new RegExp(escapeRegex(q), 'i');
    const wants = (kind) => !type || type === kind;

    await syncAllDebates();

    const [users, debates, talks] = await Promise.all([
      wants('users')
        ? User.find({
          status: 'Active',
          $or: [{ username: pattern }, { 'profile.displayName': pattern }, { 'profile.bio': pattern }],
        })
          .select('username profile.avatar profile.displayName profile.bio followers')
          .limit(limit)
          .lean()
        : [],
      wants('debates')
        ? Debate.find({
          visibility: 'public',
          $or: [{ title: pattern }, { description: pattern }, { category: pattern }, { tags: pattern }],
        })
          .select('title description status category stats options creator createdAt lifecycle')
          .sort({ createdAt: -1 })
          .limit(limit)
          .populate('creator', 'username profile.avatar')
          .lean()
        : [],
      wants('talks') && req.user
        ? Talk.find(q.startsWith('#') ? { hashtags: q.toLowerCase() } : { content: pattern })
          .sort({ _id: -1 })
          .limit(limit)
          .populate('author', 'username profile.avatar profile.displayName')
          .lean()
        : [],
    ]);

    return successResponse(res, 200, 'Search results', {
      users: users.map(({ followers, ...user }) => ({ ...user, followerCount: followers?.length || 0 })),
      debates,
      talks,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  globalSearch
};
