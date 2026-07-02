import api from './axios.js';

// =============================================================================
// Posts API Service - Communicates with MongoDB-driven backend
// =============================================================================

/**
 * Fetch paginated feed of posts
 * @param {Object} options - { page, limit }
 * @returns {Promise<{posts: Array, pagination: Object}>}
 */
export const fetchPosts = async (options = {}) => {
  const { page = 1, limit = 10 } = options;
  const response = await api.get('/posts', { params: { page, limit } });
  const postsList = Array.isArray(response) ? response : (response?.posts || response?.data || []);
  return { posts: postsList, pagination: response?.pagination || {} };
};


/**
 * Fetch a single post by ID
 * @param {string} postId
 * @returns {Promise<Object>}
 */
export const fetchPost = async (postId) => {
  const response = await api.get(`/posts/${postId}`);
  return response.post;
};


/**
 * Create a new post
 * @param {Object} postData - { text, media, metadata, sourceUrl }
 * @returns {Promise<Object>}
 */
export const createPost = async (postData) => {
  const { content, text, body, media, metadata, sourceUrl } = postData || {};
  const finalContent = content || text || body || '';

  const response = await api.post('/posts', {
    content: finalContent,
    text: finalContent, // Backend strictly expects 'text' property
    media,
    metadata: { ...metadata, sourceUrl },
  });

  return response?.post || response?.data || response;
};


/**
 * React to a post (toggle reaction)
 * @param {string} postId
 * @param {string} reactionType - 'like', 'dislike', etc.
 * @returns {Promise<Object>}
 */
export const reactToPost = async (postId, reactionType) => {
  const response = await api.patch(`/posts/${postId}/react`, { reactionType });
  return response;
};


/**
 * Delete a post
 * @param {string} postId
 * @returns {Promise<void>}
 */
export const deletePost = async (postId) => {
  await api.delete(`/posts/${postId}`);
};


/**
 * Fetch user posts
 * @param {string} userId
 * @param {Object} options - { page, limit }
 * @returns {Promise<Object>}
 */
export const fetchUserPosts = async (userId, options = {}) => {
  try {
    const { page = 1, limit = 10 } = options;
    const response = await api.get('/posts', { params: { author: userId, page, limit } });
    const postsList = Array.isArray(response) ? response : (response?.posts || response?.data || []);
    return { posts: postsList };
  } catch (error) {
    console.warn('[postsApi] fetchUserPosts failed:', error);
    return { posts: [] };
  }
};

export default {
  fetchPosts,
  fetchPost,
  createPost,
  reactToPost,
  deletePost,
  fetchUserPosts,
};
