import { apiClient } from './api';

export const talkService = {
  createTalk: async (formData) => {
    // We must omit the 'Content-Type' header to let browser set it with boundary for multipart/form-data
    return apiClient.post('/talks', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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
  }
};
