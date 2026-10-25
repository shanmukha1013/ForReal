const mongoose = require('mongoose');
const Debate = require('../models/Debate');
const DebateVote = require('../models/DebateVote');
const DebateComment = require('../models/DebateComment');
const ArgumentEndorsement = require('../models/ArgumentEndorsement');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { successResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { emitToRoom } = require('../sockets');
const { notify } = require('../services/notificationService');
const { syncAllDebates, syncDebate, isOpen, OPEN_STATUSES } = require('../services/debateLifecycle');
const { CATEGORIES, DURATIONS } = require('../config/debateOptions');
const {
  httpError,
  isObjectId,
  asString,
  asTrimmed,
  clampInt,
  normalizeUsername,
  normalizeReferenceUrl,
} = require('../utils/validators');

const CREATOR_FIELDS = 'username profile.avatar profile.displayName';
const AUTHOR_FIELDS = 'username profile.avatar profile.displayName';
// Legacy placeholder fields that never held real analysis are not exposed.
const HIDDEN_DEBATE_FIELDS = '-aiAnalysis -finalVerdict.aiVerdict -finalVerdict.confidence';

const isModerator = (user) => user?.role === 'Admin' || user?.role === 'Moderator';
const sameId = (a, b) => Boolean(a && b) && a.toString() === b.toString();

// Real-time payload: only the fields that change, so clients merge it into the
// debate they already have (keeping the populated creator, description, ...).
const liveFields = (debate) => ({
  _id: debate._id,
  status: debate.status,
  options: debate.options,
  stats: debate.stats,
  lifecycle: debate.lifecycle,
  finalVerdict: debate.finalVerdict,
});

// Returns true when the user has neither voted nor argued in the debate yet.
const isNewParticipant = async (debateId, userId) => {
  const [voted, argued] = await Promise.all([
    DebateVote.exists({ debate: debateId, user: userId }),
    DebateComment.exists({ debate: debateId, author: userId }),
  ]);
  return !voted && !argued;
};

const normalizeReferences = (body) => {
  const raw = Array.isArray(body.references)
    ? body.references.map((ref) => (typeof ref === 'string' ? ref : ref?.url))
    : [body.referenceUrl];
  const urls = raw.map(normalizeReferenceUrl).filter(Boolean);
  return [...new Set(urls)].slice(0, 3).map((url) => ({ url, title: new URL(url).hostname.replace(/^www\./, '') }));
};

const withEndorsementState = async (comments, userId) => {
  if (!userId || !comments.length) {
    return comments.map((c) => ({ ...c, isEndorsed: false }));
  }
  const endorsed = await ArgumentEndorsement.find({
    user: userId,
    comment: { $in: comments.map((c) => c._id) },
  }).select('comment').lean();
  const set = new Set(endorsed.map((e) => e.comment.toString()));
  return comments.map((c) => ({ ...c, isEndorsed: set.has(c._id.toString()) }));
};

// Aggregated, real statistics about the arguments made on each side.
const buildPulse = async (debateId) => {
  const id = new mongoose.Types.ObjectId(debateId);
  const [sides, replies] = await Promise.all([
    DebateComment.aggregate([
      { $match: { debate: id, parentComment: null } },
      {
        $group: {
          _id: '$optionId',
          arguments: { $sum: 1 },
          withEvidence: {
            $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$references', []] } }, 0] }, 1, 0] },
          },
          endorsements: { $sum: { $ifNull: ['$reactionsCount.like', 0] } },
        },
      },
    ]),
    DebateComment.countDocuments({ debate: id, parentComment: { $ne: null } }),
  ]);

  return {
    sides: sides.map((s) => ({
      optionId: s._id,
      arguments: s.arguments,
      withEvidence: s.withEvidence,
      endorsements: s.endorsements,
    })),
    totalArguments: sides.reduce((sum, s) => sum + s.arguments, 0),
    evidenceBacked: sides.reduce((sum, s) => sum + s.withEvidence, 0),
    replies,
  };
};

// @desc    Create a new debate
// @route   POST /api/debates
// @access  Private
const createDebate = async (req, res, next) => {
  try {
    const title = asTrimmed(req.body.title);
    const description = asTrimmed(req.body.description);
    const category = asTrimmed(req.body.category);
    const duration = Number(req.body.durationMinutes) || 1440;
    const rawOptions = Array.isArray(req.body.options) ? req.body.options : [];

    if (title.length < 8 || title.length > 200) throw httpError(400, 'The question must be 8-200 characters.');
    if (!description || description.length > 2000) throw httpError(400, 'Add context of up to 2000 characters.');
    if (!CATEGORIES.includes(category)) throw httpError(400, 'Pick a category from the list.');
    if (!DURATIONS.includes(duration)) throw httpError(400, 'Pick a duration from the list.');

    const labels = rawOptions
      .map((opt) => asTrimmed(typeof opt === 'string' ? opt : opt?.label))
      .filter(Boolean);
    if (labels.length < 2 || labels.length > 4) throw httpError(400, 'A debate needs 2 to 4 sides.');
    if (labels.some((label) => label.length > 80)) throw httpError(400, 'Each side is limited to 80 characters.');
    if (new Set(labels.map((l) => l.toLowerCase())).size !== labels.length) {
      throw httpError(400, 'Each side must be different.');
    }

    const now = Date.now();
    const debate = await Debate.create({
      creator: req.user._id,
      title,
      description,
      category,
      options: labels.map((label) => ({ label, votes: 0 })),
      duration,
      visibility: 'public',
      settings: { evidenceRequired: req.body.evidenceRequired === true },
      tags: [],
      lifecycle: { startedAt: now, endsAt: new Date(now + duration * 60000) },
      timeline: [{
        type: 'CREATED',
        title: 'Debate opened',
        description: `${req.user.username} opened the floor.`,
      }],
    });

    const populated = await Debate.findById(debate._id)
      .select(HIDDEN_DEBATE_FIELDS)
      .populate('creator', CREATOR_FIELDS)
      .lean();

    logger.info(`Debate created: ${debate._id} by ${req.user.username}`);
    return successResponse(res, 201, 'Debate created successfully', populated);
  } catch (error) {
    return next(error);
  }
};

// @desc    Delete a debate and everything attached to it
// @route   DELETE /api/debates/:id
// @access  Private
const deleteDebate = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) throw httpError(400, 'Invalid debate id');
    const debate = await Debate.findById(req.params.id).select('creator');
    if (!debate) throw httpError(404, 'Debate not found');

    if (!sameId(debate.creator, req.user._id) && !isModerator(req.user)) {
      throw httpError(403, 'Not authorized to delete this debate');
    }

    await Promise.all([
      Debate.deleteOne({ _id: debate._id }),
      DebateComment.deleteMany({ debate: debate._id }),
      DebateVote.deleteMany({ debate: debate._id }),
      ArgumentEndorsement.deleteMany({ debate: debate._id }),
      Notification.deleteMany({ entity: debate._id, entityModel: 'Debate' }),
    ]);

    return successResponse(res, 200, 'Debate deleted successfully', { id: req.params.id });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get debates feed (paginated)
// @route   GET /api/debates?sort=trending|newest|ending_soon&status=open|finished&category=&username=
// @access  Public
const getDebates = async (req, res, next) => {
  try {
    await syncAllDebates();

    const limit = clampInt(req.query.limit, { fallback: 10, max: 30 });
    const page = clampInt(req.query.page, { fallback: 1, max: 1000 });
    const sort = asString(req.query.sort);
    const status = asString(req.query.status);
    const category = asString(req.query.category);
    const username = normalizeUsername(req.query.username);

    const query = { visibility: 'public' };
    if (category && CATEGORIES.includes(category)) query.category = category;
    if (status === 'open' || status === 'live') query.status = { $in: OPEN_STATUSES };
    if (status === 'finished') query.status = 'finished';

    if (username) {
      const user = await User.findOne({ username }).select('_id').lean();
      if (!user) {
        return successResponse(res, 200, 'Debates fetched', { debates: [], page, pages: 0, total: 0 });
      }
      query.creator = user._id;
    }

    let sortQuery = { createdAt: -1 };
    if (sort === 'trending') {
      sortQuery = { 'stats.participantCount': -1, 'stats.totalVotes': -1, createdAt: -1 };
    } else if (sort === 'ending_soon') {
      query.status = { $in: OPEN_STATUSES };
      sortQuery = { 'lifecycle.endsAt': 1 };
    }

    const [debates, total] = await Promise.all([
      Debate.find(query)
        .select(`${HIDDEN_DEBATE_FIELDS} -timeline`)
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('creator', CREATOR_FIELDS)
        .lean(),
      Debate.countDocuments(query),
    ]);

    return successResponse(res, 200, 'Debates fetched', {
      debates,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get a single debate with the viewer's vote and argument statistics
// @route   GET /api/debates/:id
// @access  Public (personalised when signed in)
const getDebate = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) throw httpError(404, 'Debate not found');

    let debate = await Debate.findById(req.params.id)
      .select(HIDDEN_DEBATE_FIELDS)
      .populate('creator', CREATOR_FIELDS)
      .lean();
    if (!debate) throw httpError(404, 'Debate not found');

    debate = await syncDebate(debate);

    const [vote, pulse] = await Promise.all([
      req.user ? DebateVote.findOne({ debate: debate._id, user: req.user._id }).select('optionId').lean() : null,
      buildPulse(debate._id),
      Debate.updateOne({ _id: debate._id }, { $inc: { 'stats.totalViews': 1 } }),
    ]);

    return successResponse(res, 200, 'Debate fetched', {
      ...debate,
      userVote: vote?.optionId || null,
      pulse,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Vote on (or switch to) a debate option
// @route   POST /api/debates/:id/vote
// @access  Private
const voteOnDebate = async (req, res, next) => {
  try {
    const { optionId } = req.body;
    if (!isObjectId(req.params.id)) throw httpError(404, 'Debate not found');
    if (!isObjectId(optionId)) throw httpError(400, 'Invalid option');

    let debate = await Debate.findById(req.params.id).select('options status lifecycle duration stats creator').lean();
    if (!debate) throw httpError(404, 'Debate not found');
    debate = await syncDebate(debate);
    if (!isOpen(debate)) throw httpError(400, 'Voting is closed for this debate.');
    if (!debate.options.some((opt) => sameId(opt._id, optionId))) throw httpError(400, 'Invalid option');

    const userId = req.user._id;
    const existing = await DebateVote.findOne({ user: userId, debate: debate._id });

    let update;
    if (existing) {
      if (sameId(existing.optionId, optionId)) {
        return successResponse(res, 200, 'Vote unchanged', { ...liveFields(debate), userVote: existing.optionId });
      }
      const previous = existing.optionId;
      existing.optionId = optionId;
      await existing.save();
      update = Debate.findOneAndUpdate(
        { _id: debate._id },
        { $inc: { 'options.$[prev].votes': -1, 'options.$[next].votes': 1 } },
        {
          returnDocument: 'after',
          arrayFilters: [{ 'prev._id': previous, 'prev.votes': { $gt: 0 } }, { 'next._id': new mongoose.Types.ObjectId(optionId) }],
        }
      );
    } else {
      const newParticipant = await isNewParticipant(debate._id, userId);
      try {
        await DebateVote.create({ user: userId, debate: debate._id, optionId });
      } catch (error) {
        if (error.code === 11000) throw httpError(409, 'Your vote is already being recorded.');
        throw error;
      }
      update = Debate.findOneAndUpdate(
        { _id: debate._id },
        {
          $inc: {
            'options.$[next].votes': 1,
            'stats.totalVotes': 1,
            ...(newParticipant ? { 'stats.participantCount': 1 } : {}),
          },
        },
        { returnDocument: 'after', arrayFilters: [{ 'next._id': new mongoose.Types.ObjectId(optionId) }] }
      );
    }

    const updated = await update.select('options stats status lifecycle finalVerdict').lean();
    emitToRoom(`debate_${debate._id}`, 'debate_updated', liveFields(updated));

    return successResponse(res, 200, existing ? 'Vote updated' : 'Vote recorded', {
      ...liveFields(updated),
      userVote: optionId,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Post an argument (or a reply to one)
// @route   POST /api/debates/:id/comments
// @access  Private
const addDebateComment = async (req, res, next) => {
  try {
    const debateId = req.params.id;
    if (!isObjectId(debateId)) throw httpError(404, 'Debate not found');

    const content = asTrimmed(req.body.content);
    if (!content) throw httpError(400, 'Your argument cannot be empty.');
    if (content.length > 2000) throw httpError(400, 'Arguments are limited to 2000 characters.');

    let debate = await Debate.findById(debateId).select('options status lifecycle duration creator settings title stats').lean();
    if (!debate) throw httpError(404, 'Debate not found');
    debate = await syncDebate(debate);
    if (!isOpen(debate)) throw httpError(400, 'This debate is closed. The record is final.');

    // Resolve the parent. Replies always attach to a top-level argument so
    // threads stay one level deep.
    let parent = null;
    if (req.body.parentComment) {
      if (!isObjectId(req.body.parentComment)) throw httpError(400, 'Invalid parent argument');
      parent = await DebateComment.findOne({ _id: req.body.parentComment, debate: debateId })
        .select('author parentComment optionId');
      if (!parent) throw httpError(404, 'The argument you replied to no longer exists.');
      if (parent.parentComment) {
        parent = await DebateComment.findById(parent.parentComment).select('author parentComment optionId');
        if (!parent) throw httpError(404, 'The argument you replied to no longer exists.');
      }
    }

    let optionId = null;
    if (req.body.optionId) {
      if (!debate.options.some((opt) => sameId(opt._id, req.body.optionId))) throw httpError(400, 'Pick one of the debate sides.');
      optionId = req.body.optionId;
    }

    const references = normalizeReferences(req.body);
    if (!parent && debate.settings?.evidenceRequired && references.length === 0) {
      throw httpError(400, 'This debate requires a source link with every argument.');
    }

    const newParticipant = await isNewParticipant(debate._id, req.user._id);
    const comment = await DebateComment.create({
      author: req.user._id,
      debate: debate._id,
      optionId,
      content,
      references,
      parentComment: parent?._id || null,
    });

    await Promise.all([
      Debate.updateOne(
        { _id: debate._id },
        { $inc: { 'stats.totalComments': 1, ...(newParticipant ? { 'stats.participantCount': 1 } : {}) } }
      ),
      parent && DebateComment.updateOne({ _id: parent._id }, { $inc: { repliesCount: 1 } }),
    ]);

    const populated = await DebateComment.findById(comment._id).populate('author', AUTHOR_FIELDS).lean();
    const payload = { ...populated, isEndorsed: false };

    if (parent) {
      emitToRoom(`debate_${debateId}`, 'new_reply', { parentId: parent._id, reply: payload });
      notify({ recipient: parent.author, sender: req.user._id, type: 'reply', entity: debate._id, entityModel: 'Debate', message: debate.title });
    } else {
      emitToRoom(`debate_${debateId}`, 'new_comment', payload);
      notify({ recipient: debate.creator, sender: req.user._id, type: 'comment', entity: debate._id, entityModel: 'Debate', message: debate.title });
    }

    return successResponse(res, 201, 'Argument posted', payload);
  } catch (error) {
    return next(error);
  }
};

// @desc    Get top-level arguments for a debate (paginated, filterable)
// @route   GET /api/debates/:id/comments?sort=newest|top&side=<optionId>|neutral
// @access  Public (personalised when signed in)
const getDebateComments = async (req, res, next) => {
  try {
    const debateId = req.params.id;
    if (!isObjectId(debateId)) throw httpError(404, 'Debate not found');

    const limit = clampInt(req.query.limit, { fallback: 20, max: 50 });
    const page = clampInt(req.query.page, { fallback: 1, max: 1000 });
    const side = asString(req.query.side);

    const query = { debate: debateId, parentComment: null };
    if (side === 'neutral') query.optionId = null;
    else if (isObjectId(side)) query.optionId = side;

    const sortQuery = req.query.sort === 'top'
      ? { 'reactionsCount.like': -1, createdAt: -1 }
      : { createdAt: -1 };

    const [comments, total] = await Promise.all([
      DebateComment.find(query)
        .select('-isAiVerified -factCheckScore -credibilityWeight')
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('author', AUTHOR_FIELDS)
        .lean(),
      DebateComment.countDocuments(query),
    ]);

    return successResponse(res, 200, 'Comments fetched', {
      comments: await withEndorsementState(comments, req.user?._id),
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get replies for a specific argument
// @route   GET /api/debates/:id/comments/:commentId/replies
// @access  Public (personalised when signed in)
const getDebateCommentReplies = async (req, res, next) => {
  try {
    const { id: debateId, commentId } = req.params;
    if (!isObjectId(debateId) || !isObjectId(commentId)) throw httpError(400, 'Invalid id');

    const replies = await DebateComment.find({ debate: debateId, parentComment: commentId })
      .select('-isAiVerified -factCheckScore -credibilityWeight')
      .sort({ createdAt: 1 })
      .limit(100)
      .populate('author', AUTHOR_FIELDS)
      .lean();

    return successResponse(res, 200, 'Replies fetched', {
      replies: await withEndorsementState(replies, req.user?._id),
      total: replies.length,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Edit an argument
// @route   PUT /api/debates/:id/comments/:commentId
// @access  Private
const updateDebateComment = async (req, res, next) => {
  try {
    const { id: debateId, commentId } = req.params;
    if (!isObjectId(debateId) || !isObjectId(commentId)) throw httpError(400, 'Invalid id');

    const content = asTrimmed(req.body.content);
    if (!content) throw httpError(400, 'Your argument cannot be empty.');
    if (content.length > 2000) throw httpError(400, 'Arguments are limited to 2000 characters.');

    const comment = await DebateComment.findOne({ _id: commentId, debate: debateId }).select('author');
    if (!comment) throw httpError(404, 'Argument not found');
    if (!sameId(comment.author, req.user._id)) throw httpError(403, 'Not authorized to edit this argument');

    const debate = await Debate.findById(debateId).select('status lifecycle duration options stats creator').lean();
    const synced = await syncDebate(debate);
    if (!synced || !isOpen(synced)) throw httpError(400, 'This debate is closed. The record is final.');

    const updated = await DebateComment.findByIdAndUpdate(
      commentId,
      { content, isEdited: true },
      { returnDocument: 'after' }
    ).populate('author', AUTHOR_FIELDS).lean();

    return successResponse(res, 200, 'Argument updated', updated);
  } catch (error) {
    return next(error);
  }
};

// @desc    Delete an argument (and its replies)
// @route   DELETE /api/debates/:id/comments/:commentId
// @access  Private — author, debate creator or moderator
const deleteDebateComment = async (req, res, next) => {
  try {
    const { id: debateId, commentId } = req.params;
    if (!isObjectId(debateId) || !isObjectId(commentId)) throw httpError(400, 'Invalid id');

    const comment = await DebateComment.findOne({ _id: commentId, debate: debateId }).select('author parentComment');
    if (!comment) throw httpError(404, 'Argument not found');

    const debate = await Debate.findById(debateId).select('creator').lean();
    const allowed = sameId(comment.author, req.user._id)
      || sameId(debate?.creator, req.user._id)
      || isModerator(req.user);
    if (!allowed) throw httpError(403, 'Not authorized to delete this argument');

    const replyIds = (await DebateComment.find({ parentComment: comment._id }).select('_id').lean()).map((r) => r._id);
    const removedIds = [comment._id, ...replyIds];

    await Promise.all([
      DebateComment.deleteMany({ _id: { $in: removedIds } }),
      ArgumentEndorsement.deleteMany({ comment: { $in: removedIds } }),
      Debate.updateOne({ _id: debateId }, { $inc: { 'stats.totalComments': -removedIds.length } }),
      comment.parentComment && DebateComment.updateOne(
        { _id: comment.parentComment, repliesCount: { $gt: 0 } },
        { $inc: { repliesCount: -1 } }
      ),
    ]);
    await Debate.updateOne({ _id: debateId, 'stats.totalComments': { $lt: 0 } }, { 'stats.totalComments': 0 });

    return successResponse(res, 200, 'Argument deleted successfully', { id: commentId, removed: removedIds.length });
  } catch (error) {
    return next(error);
  }
};

// @desc    Toggle an endorsement ("strong point") on an argument
// @route   POST /api/debates/:id/comments/:commentId/endorse
// @access  Private
const endorseArgument = async (req, res, next) => {
  try {
    const { id: debateId, commentId } = req.params;
    if (!isObjectId(debateId) || !isObjectId(commentId)) throw httpError(400, 'Invalid id');

    const comment = await DebateComment.findOne({ _id: commentId, debate: debateId }).select('author');
    if (!comment) throw httpError(404, 'Argument not found');
    if (sameId(comment.author, req.user._id)) throw httpError(400, 'You cannot endorse your own argument.');

    const removed = await ArgumentEndorsement.findOneAndDelete({ user: req.user._id, comment: comment._id });
    let isEndorsed = false;
    if (!removed) {
      try {
        await ArgumentEndorsement.create({ user: req.user._id, comment: comment._id, debate: debateId });
        isEndorsed = true;
      } catch (error) {
        if (error.code !== 11000) throw error;
        isEndorsed = true;
      }
    }

    const delta = removed ? -1 : isEndorsed ? 1 : 0;
    const updated = await DebateComment.findByIdAndUpdate(
      comment._id,
      { $inc: { 'reactionsCount.like': delta } },
      { returnDocument: 'after' }
    ).select('reactionsCount').lean();

    if (isEndorsed && !removed) {
      notify({ recipient: comment.author, sender: req.user._id, type: 'like', entity: debateId, entityModel: 'Debate' });
    }

    return successResponse(res, 200, isEndorsed ? 'Argument endorsed' : 'Endorsement removed', {
      _id: commentId,
      endorsements: Math.max(0, updated?.reactionsCount?.like || 0),
      isEndorsed,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Recent arguments posted by a user
// @route   GET /api/debates/arguments/by/:username
// @access  Public
const getUserArguments = async (req, res, next) => {
  try {
    const username = normalizeUsername(req.params.username);
    const user = await User.findOne({ username }).select('_id').lean();
    if (!user) return successResponse(res, 200, 'Arguments fetched', { arguments: [] });

    const args = await DebateComment.find({ author: user._id })
      .select('content optionId debate createdAt reactionsCount repliesCount references parentComment')
      .sort({ createdAt: -1 })
      .limit(clampInt(req.query.limit, { fallback: 20, max: 50 }))
      .populate('debate', 'title options status')
      .lean();

    return successResponse(res, 200, 'Arguments fetched', {
      arguments: args.filter((arg) => arg.debate), // skip arguments of deleted debates
    });
  } catch (error) {
    return next(error);
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
  deleteDebateComment,
  endorseArgument,
  getUserArguments,
};
