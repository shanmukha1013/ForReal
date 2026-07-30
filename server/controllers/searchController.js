const User = require('../models/User');
const Debate = require('../models/Debate');
const { successResponse } = require('../utils/apiResponse');

// @desc    Global search for users and debates
// @route   GET /api/search
// @access  Public
const globalSearch = async (req, res, next) => {
  try {
    const { q, type, limit = 10, page = 1 } = req.query;

    if (!q) {
      return successResponse(res, 200, 'Empty search', { users: [], debates: [] });
    }

    const searchQuery = { $regex: q, $options: 'i' };
    const results = {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (!type || type === 'users') {
      results.users = await User.find({ 
        $or: [
          { username: searchQuery },
          { 'profile.bio': searchQuery }
        ]
      })
      .select('username profile.avatar credibilityScore badges followers')
      .skip(skip)
      .limit(parseInt(limit));
    }

    if (!type || type === 'debates') {
      results.debates = await Debate.find({
        $or: [
          { title: searchQuery },
          { description: searchQuery },
          { tags: searchQuery }
        ],
        visibility: 'public'
      })
      .select('title status category stats creator createdAt')
      .populate('creator', 'username profile.avatar')
      .skip(skip)
      .limit(parseInt(limit));
    }

    return successResponse(res, 200, 'Search results', results);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  globalSearch
};
