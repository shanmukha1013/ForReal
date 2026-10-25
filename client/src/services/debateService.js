import { apiClient } from './api';

export const debateService = {
  list: (params = {}) => apiClient.get('/debates', { params }),
  get: (id) => apiClient.get(`/debates/${id}`),
  create: (data) => apiClient.post('/debates', data),
  remove: (id) => apiClient.delete(`/debates/${id}`),
  vote: (id, optionId) => apiClient.post(`/debates/${id}/vote`, { optionId }),

  listArguments: (id, params = {}) => apiClient.get(`/debates/${id}/comments`, { params }),
  listReplies: (id, commentId) => apiClient.get(`/debates/${id}/comments/${commentId}/replies`),
  postArgument: (id, data) => apiClient.post(`/debates/${id}/comments`, data),
  editArgument: (id, commentId, content) => apiClient.put(`/debates/${id}/comments/${commentId}`, { content }),
  deleteArgument: (id, commentId) => apiClient.delete(`/debates/${id}/comments/${commentId}`),
  endorse: (id, commentId) => apiClient.post(`/debates/${id}/comments/${commentId}/endorse`),

  argumentsBy: (username) => apiClient.get(`/debates/arguments/by/${encodeURIComponent(username)}`),
};
