import Post from '../models/Post.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';
import { emitNotification } from '../socket.js';

// ============================================================================
// Post Controller - Production-ready with proper error handling
// ============================================================================

const validObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

const transformComment = (comment) => ({
  _id: comment._id,
  content: comment.text,
  text: comment.text,
  author: comment.author,
  replies: (comment.replies || []).map((reply) => ({
    _id: reply._id,
    content: reply.text,
    text: reply.text,
    author: reply.author,
    createdAt: reply.createdAt,
  })),
  createdAt: comment.createdAt,
});

const transformPost = (post) => ({
  _id: post._id,
  content: post.text,
  text: post.text,
  media: post.media || [],
  author: post.author,
  likes: post.reactions?.likes || [],
  dislikes: post.reactions?.dislikes || [],
  likesCount: post.likesCount || 0,
  dislikesCount: post.dislikesCount || 0,
  commentsCount: post.commentsCount || 0,
  comments: (post.comments || []).map(transformComment),
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  metadata: post.metadata,
  tags: post.metadata?.tags || [],
  sourceUrl: post.metadata?.sourceUrl || '',
  verifications: post.metadata?.verifications || [],
  disputes: post.metadata?.disputes || [],
  agrees: post.reactions?.agrees || [],
  disagrees: post.reactions?.disagrees || [],
  facts: post.reactions?.facts || [],
  caps: post.reactions?.caps || [],
  misleadings: post.reactions?.misleadings || [],
  validPoints: post.reactions?.validPoints || [],
});

/**
 * Create a new post
 * POST /api/posts
 */
export const createPost = async (req, res, next) => {
  try {
    const { text, media, metadata } = req.body;
    const authorId = req.user.id;

    // Validation
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Post text is required' });
    }

    if (text.length > 280) {
      return res.status(400).json({ message: 'Post text cannot exceed 280 characters' });
    }

    // Verify author exists
    const author = await User.findById(authorId);
    if (!author) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Create post with author from authenticated session
    const post = new Post({
      author: authorId, // Enforced from JWT - prevents spoofing
      text: text.trim(),
      media: media || [],
      metadata: metadata || {},
    });

    await post.save();

    // Parse mentions from text and notify them
    const mentionRegex = /@([a-zA-Z0-9_]{3,30})/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1].toLowerCase());
    }

    if (mentions.length > 0) {
      const mentionedUsers = await User.find({ username: { $in: mentions } }).select('_id').lean();
      const notificationsObj = mentionedUsers
        .filter(u => String(u._id) !== String(authorId))
        .map(u => ({
          userId: u._id,
          type: 'mention',
          actorId: authorId,
          payload: {
            title: 'You were mentioned',
            body: `${author.username || 'Someone'} mentioned you in a post.`,
          }
        }));
      if (notificationsObj.length > 0) {
        const createdNotifications = await Notification.insertMany(notificationsObj);
        createdNotifications.forEach(notif => emitNotification(notif.userId, notif));
      }
    }

    // Populate author for response (without password)
    await post.populate('author', '-password -__v');

    res.status(201).json({
      post: transformPost(post.toObject()),
    });
  } catch (err) {
    console.error('[postController.createPost] error:', err);
    next(err);
  }
};

/**
 * Get paginated feed of posts
 * GET /api/posts
 */
export const getFeed = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const query = { isDeleted: { $ne: true } };

    if (req.query.author) {
      if (!validObjectId(req.query.author)) {
        return res.status(400).json({ message: 'Invalid author id' });
      }
      query.author = req.query.author;
    }

    // Query with proper projection for performance
    const posts = await Post.find(query)
      .populate('author', '-password -__v')
      .populate('comments.author', 'username displayName avatar')
      .populate('comments.replies.author', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v -isDeleted')
      .lean();

    const total = await Post.countDocuments(query);

    // Transform for client compatibility
    const transformedPosts = posts.map(transformPost);

    res.json({
      posts: transformedPosts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (err) {
    console.error('[postController.getFeed] error:', err);
    next(err);
  }
};

/**
 * Get a single post by ID
 * GET /api/posts/:id
 */
export const getPost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await Post.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('author', '-password -__v')
      .populate('comments.author', 'username displayName avatar')
      .populate('comments.replies.author', 'username displayName avatar')
      .select('-__v -isDeleted');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json({ post: transformPost(post.toObject()) });
  } catch (err) {
    console.error('[postController.getPost] error:', err);
    next(err);
  }
};

/**
 * Delete a post (owner only)
 * DELETE /api/posts/:id
 */
export const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await Post.findOne({ _id: id, isDeleted: { $ne: true } });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Ownership/admin check
    const isOwner = String(post.author) === String(userId);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    // Soft delete
    post.isDeleted = true;
    post.deletedAt = new Date();
    await post.save();

    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('[postController.deletePost] error:', err);
    next(err);
  }
};

/**
 * Get comments for a post.
 * GET /api/posts/:id/comments
 */
export const getComments = async (req, res, next) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
      .populate('comments.author', 'username displayName avatar')
      .populate('comments.replies.author', 'username displayName avatar')
      .select('comments')
      .lean();

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json({ comments: (post.comments || []).map(transformComment) });
  } catch (err) {
    next(err);
  }
};

/**
 * Add a comment to a post.
 * POST /api/posts/:id/comments
 */
export const addComment = async (req, res, next) => {
  try {
    const text = String(req.body?.text || req.body?.content || '').trim();
    if (!text) {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    if (text.length > 500) {
      return res.status(400).json({ message: 'Comment cannot exceed 500 characters' });
    }

    const post = await Post.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.comments.push({ author: req.user.id, text });
    post.commentsCount = post.comments.length;
    await post.save();
    await post.populate('comments.author', 'username displayName avatar');

    const savedComment = post.comments[post.comments.length - 1];
    res.status(201).json({ comment: transformComment(savedComment.toObject()) });
  } catch (err) {
    next(err);
  }
};

/**
 * React to a post (toggle reaction)
 * PATCH /api/posts/:id/react
 */
export const reactToPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reactionType } = req.body; // 'like', 'dislike', 'agree', etc.
    const userId = req.user.id;

    // Validate reaction type
    const validReactions = ['like', 'dislike', 'agree', 'disagree', 'fact', 'cap', 'misleading', 'validPoint'];
    if (!validReactions.includes(reactionType)) {
      return res.status(400).json({ message: 'Invalid reaction type' });
    }

    const post = await Post.findOne({ _id: id, isDeleted: { $ne: true } });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Toggle reaction
    const reactionArray = post.reactions[reactionType] || [];
    const userIndex = reactionArray.findIndex(id => String(id) === String(userId));

    let action;
    if (userIndex === -1) {
      // Add reaction
      reactionArray.push(userId);
      post.reactions[reactionType] = reactionArray;
      action = 'added';
    } else {
      // Remove reaction
      reactionArray.splice(userIndex, 1);
      post.reactions[reactionType] = reactionArray;
      action = 'removed';
    }

    // Update counts
    post.likesCount = (post.reactions.likes || []).length;
    post.dislikesCount = (post.reactions.dislikes || []).length;
    await post.save();

    res.json({
      post: {
        _id: post._id,
        likes: post.reactions.likes || [],
        dislikes: post.reactions.dislikes || [],
        likesCount: post.likesCount,
        dislikesCount: post.dislikesCount,
      },
      reaction: reactionType,
      action,
    });
  } catch (err) {
    console.error('[postController.reactToPost] error:', err);
    next(err);
  }
};

/**
 * Get trending posts
 * GET /api/posts/trending
 */
export const getTrendingPosts = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

    // Calculate trending score (likes + dislikes + comments, weighted by recency)
    const posts = await Post.find({ isDeleted: { $ne: true } })
      .populate('author', '-password -__v')
      .select('-__v -isDeleted')
      .lean()
      .then((posts) => {
        return posts
          .map((post) => ({
            ...post,
            score: (post.likesCount || 0) + (post.dislikesCount || 0) * 0.5 + (post.commentsCount || 0),
            ageMs: Date.now() - new Date(post.createdAt).getTime(),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map(({ ageMs, ...post }) => ({
            ...post,
            trending: true,
          }));
      });

    res.json({
      posts,
      trending: true,
    });
  } catch (err) {
    console.error('[postController.getTrendingPosts] error:', err);
    next(err);
  }
};

export default {
  createPost,
  getFeed,
  getPost,
  deletePost,
  getTrendingPosts,
  reactToPost,
  getComments,
  addComment,
};
