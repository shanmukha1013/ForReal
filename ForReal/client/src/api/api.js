import apiClient from './axios.js';

// ─── Domain-Driven API Methods ──────────────────────────────────────────────
// By structuring endpoints like this, your React components stay perfectly clean:
// Example: `const data = await api.posts.getFeed({ page: 1 });`

const api = {
  auth: {
    login: (credentials) => apiClient.post('/auth/login', credentials),
    register: (userData) => apiClient.post('/auth/register', userData),
    logout: () => apiClient.post('/auth/logout'),
    getProfile: () => apiClient.get('/auth/me'),
  },
  
  posts: {
    getFeed: (params) => apiClient.get('/posts', { params }), // params: { page, limit, sort }
    getTrending: () => apiClient.get('/posts/trending'),
    create: (postData) => {
      const finalContent = postData?.content || postData?.text || postData?.body || '';
      const payload = {
        ...postData,
        content: finalContent,
        text: finalContent
      };
      return apiClient.post('/posts', payload);
    },
    getById: (id) => apiClient.get(`/posts/${id}`),
    interact: (id, action) => apiClient.patch(`/posts/${id}/react`, { reactionType: action }), // action: 'like' | 'dislike'
    delete: (id) => apiClient.delete(`/posts/${id}`),
  },
  
  comments: {
    getByPost: (postId, params) => apiClient.get(`/posts/${postId}/comments`, { params }),
    add: (postId, text) => apiClient.post(`/posts/${postId}/comments`, { text }),
    reply: (commentId, text) => apiClient.post(`/comments/${commentId}/reply`, { text }),
  },
  
  rooms: { // Realtime Debate/Discussion Rooms
    getAll: (params) => apiClient.get('/rooms', { params }), // Active, popular, etc.
    create: (roomData) => {
      const finalTitle = roomData?.topic || roomData?.title || 'Untitled Debate';
      const finalDesc = roomData?.description || roomData?.content || '';
      const payload = {
        ...roomData,
        title: finalTitle,
        topic: finalTitle,
        description: finalDesc
      };
      return apiClient.post('/rooms', payload);
    },
    getById: (roomId) => apiClient.get(`/rooms/${roomId}`),
    join: (roomId) => apiClient.post(`/rooms/${roomId}/join`),
    leave: (roomId) => apiClient.post(`/rooms/${roomId}/leave`),
    end: (roomId) => apiClient.patch(`/rooms/${roomId}/end`),
    delete: (roomId) => apiClient.delete(`/rooms/${roomId}`),
  },
  
  users: {
    // Get user profile by username (legacy)
    getProfile: (username) => apiClient.get(`/users/${username}`),
    // Get user by ID
    getById: (userId) => apiClient.get(`/users/${userId}`),
    // Update own profile (Aligned with Phase 3 REST)
    updateProfile: (userId, data) => apiClient.put(`/users/${userId}`, data),
    // Toggle follow user
    toggleFollow: (userId) => apiClient.post(`/users/${userId}/follow`),
    // Get followers of a user
    getFollowers: (userId) => apiClient.get(`/users/${userId}/followers`),
    // Get following list of a user
    getFollowing: (userId) => apiClient.get(`/users/${userId}/following`),
    // Search users by query
    search: (query) => apiClient.get('/users/search', { params: { q: query } }),
  },
  
  communities: {
    getAll: () => apiClient.get('/communities'),
    create: (data) => apiClient.post('/communities', data),
    getById: (id) => apiClient.get(`/communities/${id}`),
    join: (id) => apiClient.post(`/communities/${id}/join`),
  },
  
  explore: {
    // Align with server.js explore search route
    search: (query) => apiClient.get('/explore/search', { params: { q: query } }),
  },

  reports: {
    submit: (type, targetId, reason) => apiClient.post('/reports', { type, targetId, reason }),
  },
  
  // Phase 7: Realtime Persistence Sync Layer
  chat: {
    getConversations: () => apiClient.get('/chat/conversations'),
    getMessages: (conversationId) => apiClient.get(`/chat/${conversationId}`),
    sendMessage: (data) => apiClient.post('/chat', data), // { text, recipientId, conversationId }
    markRead: (conversationId) => apiClient.post(`/chat/${conversationId}/read`),
    getNotifications: () => apiClient.get('/chat/notifications'),
    markNotificationRead: (id) => apiClient.post(`/chat/notifications/${id}/read`),
  }
};

export default api;
