import Post from '../models/Post.js';
import User from '../models/User.js';
import createHttpError from 'http-errors';

// ============================================================================
// Post Controller - Production-ready with proper error handling
// ============================================================================

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

    // Populate author for response (without password)
    await post.populate('author', '-password -__v');

    res.status(201).json({
      post: {
        _id: post._id,
        text: post.text,
        media: post.media,
        metadata: post.metadata,
        author: post.author,
        likesCount: post.likesCount,
        dislikesCount: post.dislikesCount,
        commentsCount: post.commentsCount,
        reactions: { likes: [], dislikes: [] },
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      },
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

    // Query with proper projection for performance
    const posts = await Post.find({ isDeleted: { $ne: true } })
      .populate('author', '-password -__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v -isDeleted')
      .lean();

    const total = await Post.countDocuments({ isDeleted: { $ne: true } });

    // Transform for client compatibility
    const transformedPosts = posts.map(post => ({
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
      comments: [],
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
    }));

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
      .select('-__v -isDeleted');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Transform for client compatibility
    const transformedPost = {
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
      comments: [],
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };

    res.json({ post: transformedPost });
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

    // Ownership check
    if (String(post.author) !== String(userId)) {
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

/**
 * Delete a post
 * DELETE /api/posts/:id
 */
export const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Only creator can delete
    if (String(post.author) !== String(userId)) {
      return res.status(403).json({ message: 'Cannot delete other users posts' });
    }

    await Post.findByIdAndUpdate(id, { isDeleted: true }, { new: true });

    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error('[postController.deletePost] error:', err);
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
};
