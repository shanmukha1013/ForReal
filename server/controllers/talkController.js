const Talk = require('../models/Talk');
const Comment = require('../models/Comment');
const Reaction = require('../models/Reaction');
const Bookmark = require('../models/Bookmark');
const { apiResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');

// @desc    Create a new talk
// @route   POST /api/talks
// @access  Private
exports.createTalk = async (req, res, next) => {
  try {
    const { content, hashtags } = req.body;
    let parsedHashtags = [];
    
    if (hashtags) {
        try {
            parsedHashtags = typeof hashtags === 'string' ? JSON.parse(hashtags) : hashtags;
        } catch (e) {
            parsedHashtags = []; // fallback
        }
    }

    const media = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        media.push({
          url: `/uploads/${file.filename}`,
          type: 'image'
        });
      }
    }

    const talk = await Talk.create({
      author: req.user.id,
      content,
      hashtags: parsedHashtags,
      media
    });

    const populatedTalk = await Talk.findById(talk._id).populate('author', 'username email profile');

    res.status(201).json(apiResponse(true, 'Talk created successfully', populatedTalk));
  } catch (error) {
    logger.error(`Create Talk Error: ${error.message}`);
    next(error);
  }
};

// @desc    Get talks (feed) with cursor pagination
// @route   GET /api/talks
// @access  Private
exports.getTalks = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const cursor = req.query.cursor; // This is the ID of the last talk seen

    let query = {};
    if (cursor) {
      query = { _id: { $lt: cursor } };
    }

    const talks = await Talk.find(query)
      .sort({ _id: -1 }) // Sort by newest first
      .limit(limit)
      .populate('author', 'username email profile');

    const nextCursor = talks.length > 0 ? talks[talks.length - 1]._id : null;
    const hasMore = talks.length === limit;

    res.status(200).json(apiResponse(true, 'Talks fetched successfully', {
      talks,
      nextCursor,
      hasMore
    }));
  } catch (error) {
    logger.error(`Get Talks Error: ${error.message}`);
    next(error);
  }
};

// @desc    Update a talk
// @route   PUT /api/talks/:id
// @access  Private
exports.updateTalk = async (req, res, next) => {
  try {
    const talkId = req.params.id;
    const { content } = req.body;

    let talk = await Talk.findById(talkId);

    if (!talk) {
      return res.status(404).json(apiResponse(false, 'Talk not found', null, ['Talk not found']));
    }

    // Check ownership
    if (talk.author.toString() !== req.user.id) {
      return res.status(403).json(apiResponse(false, 'Not authorized to update this talk', null, ['Forbidden']));
    }

    talk.content = content || talk.content;
    talk.isEdited = true;
    
    await talk.save();
    
    talk = await Talk.findById(talkId).populate('author', 'username email profile');

    res.status(200).json(apiResponse(true, 'Talk updated successfully', talk));
  } catch (error) {
    logger.error(`Update Talk Error: ${error.message}`);
    next(error);
  }
};

// @desc    Delete a talk
// @route   DELETE /api/talks/:id
// @access  Private
exports.deleteTalk = async (req, res, next) => {
  try {
    const talkId = req.params.id;

    const talk = await Talk.findById(talkId);

    if (!talk) {
      return res.status(404).json(apiResponse(false, 'Talk not found', null, ['Talk not found']));
    }

    // Check ownership
    if (talk.author.toString() !== req.user.id) {
      return res.status(403).json(apiResponse(false, 'Not authorized to delete this talk', null, ['Forbidden']));
    }

    await talk.deleteOne();

    // Clean up related data (reactions, comments, bookmarks)
    await Reaction.deleteMany({ talk: talkId });
    await Comment.deleteMany({ talk: talkId });
    await Bookmark.deleteMany({ talk: talkId });

    res.status(200).json(apiResponse(true, 'Talk deleted successfully', { id: talkId }));
  } catch (error) {
    logger.error(`Delete Talk Error: ${error.message}`);
    next(error);
  }
};

// @desc    Toggle reaction on a talk
// @route   POST /api/talks/:id/reactions
// @access  Private
exports.toggleReaction = async (req, res, next) => {
  try {
    const talkId = req.params.id;
    const { type } = req.body; // 'like', 'dislike', 'agree', 'disagree'

    if (!['like', 'dislike', 'agree', 'disagree'].includes(type)) {
      return res.status(400).json(apiResponse(false, 'Invalid reaction type', null, ['Invalid type']));
    }

    const talk = await Talk.findById(talkId);
    if (!talk) {
      return res.status(404).json(apiResponse(false, 'Talk not found', null, ['Talk not found']));
    }

    const existingReaction = await Reaction.findOne({ user: req.user.id, talk: talkId });

    if (existingReaction) {
      if (existingReaction.type === type) {
        // Remove reaction
        await existingReaction.deleteOne();
        talk.reactionsCount[type] = Math.max(0, talk.reactionsCount[type] - 1);
        await talk.save();
        return res.status(200).json(apiResponse(true, 'Reaction removed', talk));
      } else {
        // Change reaction
        const oldType = existingReaction.type;
        existingReaction.type = type;
        await existingReaction.save();
        
        talk.reactionsCount[oldType] = Math.max(0, talk.reactionsCount[oldType] - 1);
        talk.reactionsCount[type] += 1;
        await talk.save();
        return res.status(200).json(apiResponse(true, 'Reaction changed', talk));
      }
    } else {
      // Add new reaction
      await Reaction.create({ user: req.user.id, talk: talkId, type });
      talk.reactionsCount[type] += 1;
      await talk.save();
      return res.status(200).json(apiResponse(true, 'Reaction added', talk));
    }
  } catch (error) {
    logger.error(`Toggle Reaction Error: ${error.message}`);
    next(error);
  }
};

// @desc    Add comment to a talk
// @route   POST /api/talks/:id/comments
// @access  Private
exports.addComment = async (req, res, next) => {
  try {
    const talkId = req.params.id;
    const { content, parentComment } = req.body;

    const talk = await Talk.findById(talkId);
    if (!talk) {
      return res.status(404).json(apiResponse(false, 'Talk not found', null, ['Talk not found']));
    }

    const comment = await Comment.create({
      author: req.user.id,
      talk: talkId,
      content,
      parentComment: parentComment || null
    });

    talk.commentsCount += 1;
    await talk.save();

    if (parentComment) {
        const parent = await Comment.findById(parentComment);
        if (parent) {
            parent.repliesCount += 1;
            await parent.save();
        }
    }

    const populatedComment = await Comment.findById(comment._id).populate('author', 'username email profile');

    res.status(201).json(apiResponse(true, 'Comment added successfully', populatedComment));
  } catch (error) {
    logger.error(`Add Comment Error: ${error.message}`);
    next(error);
  }
};

// @desc    Get comments for a talk
// @route   GET /api/talks/:id/comments
// @access  Private
exports.getComments = async (req, res, next) => {
    try {
      const talkId = req.params.id;
      
      const comments = await Comment.find({ talk: talkId, parentComment: null })
        .sort({ createdAt: 1 })
        .populate('author', 'username email profile');
  
      res.status(200).json(apiResponse(true, 'Comments fetched successfully', comments));
    } catch (error) {
      logger.error(`Get Comments Error: ${error.message}`);
      next(error);
    }
  };

// @desc    Toggle bookmark on a talk
// @route   POST /api/talks/:id/bookmarks
// @access  Private
exports.toggleBookmark = async (req, res, next) => {
    try {
      const talkId = req.params.id;
  
      const talk = await Talk.findById(talkId);
      if (!talk) {
        return res.status(404).json(apiResponse(false, 'Talk not found', null, ['Talk not found']));
      }
  
      const existingBookmark = await Bookmark.findOne({ user: req.user.id, talk: talkId });
  
      if (existingBookmark) {
        // Remove bookmark
        await existingBookmark.deleteOne();
        talk.bookmarksCount = Math.max(0, talk.bookmarksCount - 1);
        await talk.save();
        return res.status(200).json(apiResponse(true, 'Bookmark removed', talk));
      } else {
        // Add new bookmark
        await Bookmark.create({ user: req.user.id, talk: talkId });
        talk.bookmarksCount += 1;
        await talk.save();
        return res.status(200).json(apiResponse(true, 'Bookmark added', talk));
      }
    } catch (error) {
      logger.error(`Toggle Bookmark Error: ${error.message}`);
      next(error);
    }
  };
// @desc    Delete a comment
// @route   DELETE /api/talks/:id/comments/:commentId
// @access  Private
exports.deleteComment = async (req, res, next) => {
  try {
    const { id: talkId, commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json(apiResponse(false, 'Comment not found', null, ['Comment not found']));
    }

    if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json(apiResponse(false, 'Not authorized to delete this comment', null, ['Forbidden']));
    }

    await comment.deleteOne();

    const talk = await Talk.findById(talkId);
    if (talk) {
      talk.commentsCount = Math.max(0, talk.commentsCount - 1);
      await talk.save();
    }

    // Update parent comment if it was a reply
    if (comment.parentComment) {
      const parent = await Comment.findById(comment.parentComment);
      if (parent) {
        parent.repliesCount = Math.max(0, parent.repliesCount - 1);
        await parent.save();
      }
    }

    res.status(200).json(apiResponse(true, 'Comment deleted successfully'));
  } catch (error) {
    logger.error(`Delete Comment Error: ${error.message}`);
    next(error);
  }
};
