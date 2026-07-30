const Debate = require('../models/Debate');
const DebateVote = require('../models/DebateVote');
const DebateComment = require('../models/DebateComment');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const aiService = require('../services/aiService');

// @desc    Create a new debate
// @route   POST /api/debates
// @access  Private
const createDebate = async (req, res, next) => {
  try {
    const { title, description, category, options, durationMinutes, settings, visibility, tags } = req.body;

    if (!title || !description || !options || options.length < 2) {
      res.status(400);
      throw new Error('Title, description, and at least 2 options are required');
    }

    const duration = durationMinutes || 1440; // Default 24 hours
    const endsAt = new Date(Date.now() + duration * 60000);

    const formattedOptions = options.map(opt => ({
      label: opt.label,
      color: opt.color || '#00C8FF',
      votes: 0
    }));

    const debate = await Debate.create({
      creator: req.user.id,
      title,
      description,
      category,
      options: formattedOptions,
      duration,
      visibility: visibility || 'public',
      settings: settings || {},
      tags: tags || [],
      lifecycle: {
        startedAt: Date.now(),
        endsAt,
      },
      timeline: [{
        type: 'CREATED',
        title: 'Debate Started',
        description: `${req.user.username} started this debate.`
      }]
    });

    const populatedDebate = await Debate.findById(debate._id).populate('creator', 'username profile badges credibilityScore');

    return successResponse(res, 201, 'Debate created successfully', populatedDebate);
  } catch (error) {
    logger.error(`Create Debate Error: ${error.message}`);
    next(error);
  }
};

// @desc    Get debates feed (paginated)
// @route   GET /api/debates
// @access  Public
const getDebates = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;
    const skip = (page - 1) * limit;
    const { sort, category, status } = req.query;

    let query = { visibility: 'public' };
    
    if (category) query.category = category;
    if (status) query.status = status;

    let sortQuery = { createdAt: -1 }; // newest by default
    if (sort === 'trending') {
      sortQuery = { 'stats.participantCount': -1, createdAt: -1 };
    }

    const debates = await Debate.find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .populate('creator', 'username profile badges credibilityScore');

    const total = await Debate.countDocuments(query);

    return successResponse(res, 200, 'Debates fetched', {
      debates,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single debate
// @route   GET /api/debates/:id
// @access  Public
const getDebate = async (req, res, next) => {
  try {
    const debate = await Debate.findById(req.params.id)
      .populate('creator', 'username profile badges credibilityScore');

    if (!debate) {
      res.status(404);
      throw new Error('Debate not found');
    }

    // Increment views
    debate.stats.totalViews += 1;
    await debate.save();

    return successResponse(res, 200, 'Debate fetched', debate);
  } catch (error) {
    next(error);
  }
};

// @desc    Vote on a debate option
// @route   POST /api/debates/:id/vote
// @access  Private
const voteOnDebate = async (req, res, next) => {
  try {
    const { optionId } = req.body;
    const debate = await Debate.findById(req.params.id);

    if (!debate) {
      res.status(404);
      throw new Error('Debate not found');
    }

    if (debate.status !== 'live' && debate.status !== 'ending_soon') {
      res.status(400);
      throw new Error('Voting is closed for this debate');
    }

    const option = debate.options.id(optionId);
    if (!option) {
      res.status(400);
      throw new Error('Invalid option');
    }

    // Check if user already voted
    const existingVote = await DebateVote.findOne({ user: req.user.id, debate: debate._id });

    if (existingVote) {
      // Change vote
      const oldOption = debate.options.id(existingVote.optionId);
      if (oldOption) {
        oldOption.votes = Math.max(0, oldOption.votes - 1);
      }
      
      existingVote.optionId = optionId;
      await existingVote.save();
      
      option.votes += 1;
      await debate.save();

      return successResponse(res, 200, 'Vote updated', debate);
    } else {
      // New vote
      await DebateVote.create({
        user: req.user.id,
        debate: debate._id,
        optionId
      });

      option.votes += 1;
      debate.stats.totalVotes += 1;
      
      // We could add participant tracking logic here
      await debate.save();

      // Emit socket event globally (would be handled in the route/server level ideally, but we can return the debate and let frontend emit, or emit here if we pass io)
      // Since we don't have io directly in controller, we'll let frontend trigger refetch or handle it in socket server.

      return successResponse(res, 200, 'Vote recorded', debate);
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Add comment to debate
// @route   POST /api/debates/:id/comments
// @access  Private
const addDebateComment = async (req, res, next) => {
  try {
    const { content, optionId, references } = req.body;
    const debateId = req.params.id;

    const debate = await Debate.findById(debateId);
    if (!debate) {
      res.status(404);
      throw new Error('Debate not found');
    }

    // AI Fact checking logic (stubbed for now)
    const factCheckScore = await aiService.factCheckArgument(content);

    const user = await User.findById(req.user.id);
    const credibilityWeight = user.credibilityScore > 0 ? user.credibilityScore / 50 : 1; // Basic math

    const comment = await DebateComment.create({
      author: req.user.id,
      debate: debateId,
      optionId,
      content,
      references: references || [],
      factCheckScore,
      isAiVerified: factCheckScore > 80,
      credibilityWeight
    });

    debate.stats.totalComments += 1;
    await debate.save();

    const populatedComment = await DebateComment.findById(comment._id)
      .populate('author', 'username profile badges credibilityScore');

    return successResponse(res, 201, 'Comment added', populatedComment);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDebate,
  getDebates,
  getDebate,
  voteOnDebate,
  addDebateComment
};
