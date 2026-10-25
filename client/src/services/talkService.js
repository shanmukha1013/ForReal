import { apiClient } from './api';

export const talkService = {
  // Do not set Content-Type for FormData: the browser adds the boundary.
  createTalk: (formData) => apiClient.post('/talks', formData),

  getTalks: ({ cursor = null, limit = 10, author, hashtag } = {}) =>
    apiClient.get('/talks', { params: { limit, cursor: cursor || undefined, author, hashtag } }),

  getTalk: (id) => apiClient.get(`/talks/${id}`),

  updateTalk: (id, data) => apiClient.put(`/talks/${id}`, data),

  deleteTalk: (id) => apiClient.delete(`/talks/${id}`),

  toggleReaction: (id, type) => apiClient.post(`/talks/${id}/reactions`, { type }),

  toggleBookmark: (id) => apiClient.post(`/talks/${id}/bookmarks`),

  getComments: (id) => apiClient.get(`/talks/${id}/comments`),

  addComment: (id, content, parentComment = null) =>
    apiClient.post(`/talks/${id}/comments`, { content, parentComment }),

  deleteComment: (talkId, commentId) => apiClient.delete(`/talks/${talkId}/comments/${commentId}`),
};
