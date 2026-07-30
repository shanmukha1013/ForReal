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

// @desc    Delete a debate
// @route   DELETE /api/debates/:id
// @access  Private
const deleteDebate = async (req, res, next) => {
  try {
    const debate = await Debate.findById(req.params.id);

    if (!debate) {
      res.status(404);
      throw new Error('Debate not found');
    }

    if (debate.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Not authorized to delete this debate');
    }

    await Debate.findByIdAndDelete(req.params.id);
    await DebateComment.deleteMany({ debate: req.params.id });
    await DebateVote.deleteMany({ debate: req.params.id });

    return successResponse(res, 200, 'Debate deleted successfully');
  } catch (error) {
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
    const { sort, category, status, username } = req.query;

    let query = { visibility: 'public' };
    
    if (category) query.category = category;
    if (status) query.status = status;

    if (username) {
      const user = await User.findOne({ username: username.toLowerCase() });
      if (user) {
        query.creator = user._id;
      } else {
        // If user not found, return empty results
        return successResponse(res, 200, 'Debates fetched', {
          debates: [],
          page,
          pages: 0,
          total: 0
        });
      }
    }

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

      const io = require('../sockets').getIo();
      io.to(`debate_${debate._id}`).emit('debate_updated', debate);

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

      // Emit socket event globally
      const io = require('../sockets').getIo();
      io.to(`debate_${debate._id}`).emit('debate_updated', debate);

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
    const { content, optionId, references, parentComment } = req.body;
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
      credibilityWeight,
      parentComment: parentComment || null
    });

    debate.stats.totalComments += 1;
    await debate.save();

    const populatedComment = await DebateComment.findById(comment._id)
      .populate('author', 'username profile badges credibilityScore');

    // Emit to debate room
    const io = require('../sockets').getIo();
    io.to(`debate_${debateId}`).emit('new_comment', populatedComment);

    return successResponse(res, 201, 'Comment added', populatedComment);
  } catch (error) {
    next(error);
  }
};

// @desc    Get comments for a debate (paginated)
// @route   GET /api/debates/:id/comments
// @access  Public
const getDebateComments = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const page = parseInt(req.query.page, 10) || 1;
    const skip = (page - 1) * limit;
    const debateId = req.params.id;

    const comments = await DebateComment.find({ debate: debateId, parentComment: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username profile badges credibilityScore');

    const total = await DebateComment.countDocuments({ debate: debateId, parentComment: null });

    return successResponse(res, 200, 'Comments fetched', {
      comments,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get replies for a specific comment
// @route   GET /api/debates/:id/comments/:commentId/replies
// @access  Public
const getDebateCommentReplies = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;
    const page = parseInt(req.query.page, 10) || 1;
    const skip = (page - 1) * limit;

    const replies = await DebateComment.find({ parentComment: commentId })
      .sort({ createdAt: 1 }) // Chronological for replies
      .skip(skip)
      .limit(limit)
      .populate('author', 'username profile badges credibilityScore');

    const total = await DebateComment.countDocuments({ parentComment: commentId });

    return successResponse(res, 200, 'Replies fetched', {
      replies,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a debate comment
// @route   PUT /api/debates/:id/comments/:commentId
// @access  Private
const updateDebateComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    const comment = await DebateComment.findById(commentId);
    if (!comment) {
      res.status(404);
      throw new Error('Comment not found');
    }

    if (comment.author.toString() !== req.user.id) {
      res.status(403);
      throw new Error('Not authorized to edit this comment');
    }

    comment.content = content;
    comment.isEdited = true;
    
    // Optional: Re-run AI fact check
    const factCheckScore = await aiService.factCheckArgument(content);
    comment.factCheckScore = factCheckScore;
    comment.isAiVerified = factCheckScore > 80;

    await comment.save();

    const populatedComment = await DebateComment.findById(comment._id)
      .populate('author', 'username profile badges credibilityScore');

    return successResponse(res, 200, 'Comment updated', populatedComment);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a debate comment
// @route   DELETE /api/debates/:id/comments/:commentId
// @access  Private
const deleteDebateComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const comment = await DebateComment.findById(commentId);
    if (!comment) {
      res.status(404);
      throw new Error('Comment not found');
    }

    if (comment.author.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
      res.status(403);
      throw new Error('Not authorized to delete this comment');
    }

    // Instead of deleting, soft delete or just remove
    await DebateComment.findByIdAndDelete(commentId);

    // Update debate comment count
    const debate = await Debate.findById(comment.debate);
    if (debate) {
      debate.stats.totalComments = Math.max(0, debate.stats.totalComments - 1);
      await debate.save();
    }

    // Also delete all replies
    await DebateComment.deleteMany({ parentComment: commentId });

    return successResponse(res, 200, 'Comment deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDebate,
  deleteDebate,
  getDebates,
  getDebate,
  voteOnDebate,
  addDebateComment,
  getDebateComments,
  getDebateCommentReplies,
  updateDebateComment,
  deleteDebateComment
};
