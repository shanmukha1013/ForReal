const fs = require('fs/promises');
const path = require('path');
const Talk = require('../models/Talk');
const Comment = require('../models/Comment');
const Reaction = require('../models/Reaction');
const Bookmark = require('../models/Bookmark');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { apiResponse } = require('../utils/apiResponse');
const { notify } = require('../services/notificationService');
const { uploadDir } = require('../middleware/uploadMiddleware');
const {
  httpError,
  isObjectId,
  asString,
  clampInt,
  normalizeUsername,
} = require('../utils/validators');

const AUTHOR_FIELDS = 'username profile.avatar profile.displayName';
const REACTION_TYPES = ['like', 'dislike', 'agree', 'disagree'];
const MAX_TALK_LENGTH = 2000;
const MAX_COMMENT_LENGTH = 1000;

const extractHashtags = (content) => {
  const tags = content.match(/#[\p{L}\p{N}_]{1,40}/gu) || [];
  return [...new Set(tags.map((tag) => tag.toLowerCase()))].slice(0, 10);
};

const isModerator = (user) => user.role === 'Admin' || user.role === 'Moderator';

// Adds the viewer's own reaction and bookmark state to each talk with two
// batched queries instead of one query per talk.
const withViewerState = async (talks, userId) => {
  if (!talks.length) return talks;
  const ids = talks.map((talk) => talk._id);
  const [reactions, bookmarks] = await Promise.all([
    Reaction.find({ user: userId, talk: { $in: ids } }).select('talk type').lean(),
    Bookmark.find({ user: userId, talk: { $in: ids } }).select('talk').lean(),
  ]);
  const reactionByTalk = new Map(reactions.map((r) => [r.talk.toString(), r.type]));
  const bookmarked = new Set(bookmarks.map((b) => b.talk.toString()));

  return talks.map((talk) => ({
    ...talk,
    userReaction: reactionByTalk.get(talk._id.toString()) || null,
    isBookmarked: bookmarked.has(talk._id.toString()),
  }));
};

const removeUploadedFiles = async (media = []) => {
  await Promise.all(media.map(async (item) => {
    if (!item?.url?.startsWith('/uploads/')) return;
    const filePath = path.join(uploadDir, path.basename(item.url));
    try {
      await fs.unlink(filePath);
    } catch {
      // File already gone (or on another instance): nothing to clean up.
    }
  }));
};

// @desc    Create a new talk
// @route   POST /api/talks
// @access  Private
exports.createTalk = async (req, res, next) => {
  try {
    const content = asString(req.body.content).trim();
    const files = req.files || [];

    if (!content && files.length === 0) {
      await removeUploadedFiles(files.map((f) => ({ url: `/uploads/${f.filename}` })));
      throw httpError(400, 'Write something or attach an image.');
    }
    if (content.length > MAX_TALK_LENGTH) {
      await removeUploadedFiles(files.map((f) => ({ url: `/uploads/${f.filename}` })));
      throw httpError(400, `Talks are limited to ${MAX_TALK_LENGTH} characters.`);
    }

    const talk = await Talk.create({
      author: req.user._id,
      content,
      hashtags: extractHashtags(content),
      media: files.map((file) => ({ url: `/uploads/${file.filename}`, type: 'image' })),
    });
    await User.updateOne({ _id: req.user._id }, { $inc: { 'stats.talkCount': 1 } });

    const populated = await Talk.findById(talk._id).populate('author', AUTHOR_FIELDS).lean();

    res.status(201).json(apiResponse(true, 'Talk created successfully', {
      ...populated,
      userReaction: null,
      isBookmarked: false,
    }));
  } catch (error) {
    next(error);
  }
};

// @desc    Get talks (feed, a user's timeline or a hashtag) with cursor pagination
// @route   GET /api/talks?cursor=&limit=&author=&hashtag=
// @access  Private
exports.getTalks = async (req, res, next) => {
  try {
    const limit = clampInt(req.query.limit, { fallback: 10, max: 30 });
    const cursor = asString(req.query.cursor);
    const query = {};

    if (cursor) {
      if (!isObjectId(cursor)) throw httpError(400, 'Invalid cursor');
      query._id = { $lt: cursor };
    }

    const authorName = normalizeUsername(req.query.author);
    if (authorName) {
      const author = await User.findOne({ username: authorName }).select('_id').lean();
      if (!author) {
        return res.status(200).json(apiResponse(true, 'Talks fetched successfully', { talks: [], nextCursor: null, hasMore: false }));
      }
      query.author = author._id;
    }

    const hashtag = asString(req.query.hashtag).trim().toLowerCase();
    if (hashtag) query.hashtags = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;

    // Fetch one extra document to know whether another page exists.
    const docs = await Talk.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate('author', AUTHOR_FIELDS)
      .lean();

    const hasMore = docs.length > limit;
    const page = hasMore ? docs.slice(0, limit) : docs;
    const talks = await withViewerState(page, req.user._id);

    res.status(200).json(apiResponse(true, 'Talks fetched successfully', {
      talks,
      nextCursor: page.length ? page[page.length - 1]._id : null,
      hasMore,
    }));
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single talk
// @route   GET /api/talks/:id
// @access  Private
exports.getTalk = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) throw httpError(400, 'Invalid talk id');
    const talk = await Talk.findById(req.params.id).populate('author', AUTHOR_FIELDS).lean();
    if (!talk) throw httpError(404, 'Talk not found');

    const [withState] = await withViewerState([talk], req.user._id);
    res.status(200).json(apiResponse(true, 'Talk fetched successfully', withState));
  } catch (error) {
    next(error);
  }
};

// @desc    Update a talk
// @route   PUT /api/talks/:id
// @access  Private
exports.updateTalk = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) throw httpError(400, 'Invalid talk id');
    const content = asString(req.body.content).trim();
    if (!content) throw httpError(400, 'A talk cannot be empty.');
    if (content.length > MAX_TALK_LENGTH) throw httpError(400, `Talks are limited to ${MAX_TALK_LENGTH} characters.`);

    const talk = await Talk.findById(req.params.id).select('author');
    if (!talk) throw httpError(404, 'Talk not found');
    if (talk.author.toString() !== req.user._id.toString()) {
      throw httpError(403, 'Not authorized to update this talk');
    }

    const updated = await Talk.findByIdAndUpdate(
      req.params.id,
      { content, hashtags: extractHashtags(content), isEdited: true },
      { returnDocument: 'after' }
    ).populate('author', AUTHOR_FIELDS).lean();

    res.status(200).json(apiResponse(true, 'Talk updated successfully', updated));
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a talk and everything attached to it
// @route   DELETE /api/talks/:id
// @access  Private
exports.deleteTalk = async (req, res, next) => {
  try {
    const talkId = req.params.id;
    if (!isObjectId(talkId)) throw httpError(400, 'Invalid talk id');

    const talk = await Talk.findById(talkId).select('author media');
    if (!talk) throw httpError(404, 'Talk not found');
    if (talk.author.toString() !== req.user._id.toString() && !isModerator(req.user)) {
      throw httpError(403, 'Not authorized to delete this talk');
    }

    await talk.deleteOne();
    await Promise.all([
      Reaction.deleteMany({ talk: talkId }),
      Comment.deleteMany({ talk: talkId }),
      Bookmark.deleteMany({ talk: talkId }),
      Notification.deleteMany({ entity: talkId, entityModel: 'Talk' }),
      User.updateOne({ _id: talk.author, 'stats.talkCount': { $gt: 0 } }, { $inc: { 'stats.talkCount': -1 } }),
      removeUploadedFiles(talk.media),
    ]);

    res.status(200).json(apiResponse(true, 'Talk deleted successfully', { id: talkId }));
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle (or switch) the viewer's reaction on a talk
// @route   POST /api/talks/:id/reactions
// @access  Private
exports.toggleReaction = async (req, res, next) => {
  try {
    const talkId = req.params.id;
    const { type } = req.body;
    const userId = req.user._id;

    if (!isObjectId(talkId)) throw httpError(400, 'Invalid talk id');
    if (!REACTION_TYPES.includes(type)) throw httpError(400, 'Invalid reaction type');

    const talk = await Talk.findById(talkId).select('author');
    if (!talk) throw httpError(404, 'Talk not found');

    const existing = await Reaction.findOne({ user: userId, talk: talkId });
    let userReaction = type;
    let inc;

    if (!existing) {
      try {
        await Reaction.create({ user: userId, talk: talkId, type });
      } catch (error) {
        // A concurrent duplicate click already created this reaction.
        if (error.code === 11000) throw httpError(409, 'Reaction already recorded. Please retry.');
        throw error;
      }
      inc = { [`reactionsCount.${type}`]: 1 };
      notify({
        recipient: talk.author,
        sender: userId,
        type: 'reaction',
        entity: talk._id,
        entityModel: 'Talk',
        message: type,
      });
    } else if (existing.type === type) {
      await existing.deleteOne();
      userReaction = null;
      inc = { [`reactionsCount.${type}`]: -1 };
    } else {
      const previous = existing.type;
      existing.type = type;
      await existing.save();
      inc = { [`reactionsCount.${previous}`]: -1, [`reactionsCount.${type}`]: 1 };
    }

    const updated = await Talk.findByIdAndUpdate(talkId, { $inc: inc }, { returnDocument: 'after' })
      .select('reactionsCount')
      .lean();

    // Guard against legacy negative counters.
    const reactionsCount = Object.fromEntries(
      REACTION_TYPES.map((key) => [key, Math.max(0, updated?.reactionsCount?.[key] || 0)])
    );

    res.status(200).json(apiResponse(true, 'Reaction updated', { _id: talkId, reactionsCount, userReaction }));
  } catch (error) {
    next(error);
  }
};

// @desc    Add a comment (or reply) to a talk
// @route   POST /api/talks/:id/comments
// @access  Private
exports.addComment = async (req, res, next) => {
  try {
    const talkId = req.params.id;
    const content = asString(req.body.content).trim();
    const parentId = req.body.parentComment;

    if (!isObjectId(talkId)) throw httpError(400, 'Invalid talk id');
    if (!content) throw httpError(400, 'A comment cannot be empty.');
    if (content.length > MAX_COMMENT_LENGTH) throw httpError(400, `Comments are limited to ${MAX_COMMENT_LENGTH} characters.`);

    const talk = await Talk.findById(talkId).select('author');
    if (!talk) throw httpError(404, 'Talk not found');

    let parent = null;
    if (parentId) {
      if (!isObjectId(parentId)) throw httpError(400, 'Invalid parent comment');
      parent = await Comment.findOne({ _id: parentId, talk: talkId }).select('author');
      if (!parent) throw httpError(404, 'The comment you replied to no longer exists.');
    }

    const comment = await Comment.create({
      author: req.user._id,
      talk: talkId,
      content,
      parentComment: parent?._id || null,
    });

    await Promise.all([
      Talk.updateOne({ _id: talkId }, { $inc: { commentsCount: 1 } }),
      parent && Comment.updateOne({ _id: parent._id }, { $inc: { repliesCount: 1 } }),
    ]);

    notify({ recipient: talk.author, sender: req.user._id, type: 'comment', entity: talk._id, entityModel: 'Talk' });
    if (parent) {
      notify({ recipient: parent.author, sender: req.user._id, type: 'reply', entity: talk._id, entityModel: 'Talk' });
    }

    const populated = await Comment.findById(comment._id).populate('author', AUTHOR_FIELDS).lean();
    res.status(201).json(apiResponse(true, 'Comment added successfully', populated));
  } catch (error) {
    next(error);
  }
};

// @desc    Get comments for a talk
// @route   GET /api/talks/:id/comments
// @access  Private
exports.getComments = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) throw httpError(400, 'Invalid talk id');

    const comments = await Comment.find({ talk: req.params.id, parentComment: null })
      .sort({ createdAt: 1 })
      .limit(200)
      .populate('author', AUTHOR_FIELDS)
      .lean();

    res.status(200).json(apiResponse(true, 'Comments fetched successfully', comments));
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle bookmark on a talk
// @route   POST /api/talks/:id/bookmarks
// @access  Private
exports.toggleBookmark = async (req, res, next) => {
  try {
    const talkId = req.params.id;
    if (!isObjectId(talkId)) throw httpError(400, 'Invalid talk id');

    const exists = await Talk.exists({ _id: talkId });
    if (!exists) throw httpError(404, 'Talk not found');

    const removed = await Bookmark.findOneAndDelete({ user: req.user._id, talk: talkId });
    let isBookmarked = false;

    if (!removed) {
      try {
        await Bookmark.create({ user: req.user._id, talk: talkId });
        isBookmarked = true;
      } catch (error) {
        if (error.code !== 11000) throw error;
        isBookmarked = true; // concurrent duplicate request
      }
    }

    const updated = await Talk.findByIdAndUpdate(
      talkId,
      { $inc: { bookmarksCount: removed ? -1 : isBookmarked ? 1 : 0 } },
      { returnDocument: 'after' }
    ).select('bookmarksCount').lean();

    res.status(200).json(apiResponse(true, isBookmarked ? 'Bookmark added' : 'Bookmark removed', {
      _id: talkId,
      bookmarksCount: Math.max(0, updated?.bookmarksCount || 0),
      isBookmarked,
    }));
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a comment (and its replies)
// @route   DELETE /api/talks/:id/comments/:commentId
// @access  Private
exports.deleteComment = async (req, res, next) => {
  try {
    const { id: talkId, commentId } = req.params;
    if (!isObjectId(talkId) || !isObjectId(commentId)) throw httpError(400, 'Invalid id');

    const comment = await Comment.findOne({ _id: commentId, talk: talkId });
    if (!comment) throw httpError(404, 'Comment not found');

    const talk = await Talk.findById(talkId).select('author');
    const isCommentOwner = comment.author.toString() === req.user._id.toString();
    const isTalkOwner = talk && talk.author.toString() === req.user._id.toString();
    if (!isCommentOwner && !isTalkOwner && !isModerator(req.user)) {
      throw httpError(403, 'Not authorized to delete this comment');
    }

    const { deletedCount: repliesDeleted } = await Comment.deleteMany({ parentComment: comment._id });
    await comment.deleteOne();

    await Promise.all([
      Talk.updateOne({ _id: talkId }, { $inc: { commentsCount: -(1 + repliesDeleted) } }),
      comment.parentComment && Comment.updateOne(
        { _id: comment.parentComment, repliesCount: { $gt: 0 } },
        { $inc: { repliesCount: -1 } }
      ),
    ]);
    // Clamp in case of legacy drift.
    await Talk.updateOne({ _id: talkId, commentsCount: { $lt: 0 } }, { commentsCount: 0 });

    res.status(200).json(apiResponse(true, 'Comment deleted successfully', { id: commentId }));
  } catch (error) {
    next(error);
  }
};
