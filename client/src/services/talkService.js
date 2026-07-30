import { apiClient } from './api';

export const talkService = {
  createTalk: async (formData) => {
    // DO NOT set Content-Type header manually for FormData. 
    // The browser must automatically set it along with the boundary string.
    return apiClient.post('/talks', formData);
  },
  
  getTalks: async ({ cursor = null, limit = 10 } = {}) => {
    let url = `/talks?limit=${limit}`;
    if (cursor) {
      url += `&cursor=${cursor}`;
    }
    return apiClient.get(url);
  },
  
  updateTalk: async (id, data) => {
    return apiClient.put(`/talks/${id}`, data);
  },
  
  deleteTalk: async (id) => {
    return apiClient.delete(`/talks/${id}`);
  },
  
  toggleReaction: async (id, type) => {
    return apiClient.post(`/talks/${id}/reactions`, { type });
  },
  
  toggleBookmark: async (id) => {
    return apiClient.post(`/talks/${id}/bookmarks`);
  },
  
  getComments: async (id) => {
    return apiClient.get(`/talks/${id}/comments`);
  },
  
  addComment: async (id, content, parentComment = null) => {
    return apiClient.post(`/talks/${id}/comments`, { content, parentComment });
  },

  deleteComment: async (talkId, commentId) => {
    return apiClient.delete(`/talks/${talkId}/comments/${commentId}`);
  }
};
