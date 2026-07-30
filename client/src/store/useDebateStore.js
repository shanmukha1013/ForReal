import { create } from 'zustand';
import apiClient from '@/services/api';

const useDebateStore = create((set, get) => ({
  debates: [],
  currentDebate: null,
  isLoading: false,
  error: null,
  page: 1,
  hasMore: true,

  fetchDebates: async (page = 1, filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const queryParams = new URLSearchParams({ page, limit: 10, ...filters }).toString();
      const response = await apiClient.get(`/debates?${queryParams}`);
      
      set((state) => ({
        debates: page === 1 ? response.data.debates : [...state.debates, ...response.data.debates],
        page,
        hasMore: page < response.data.pages,
        isLoading: false
      }));
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  getDebate: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get(`/debates/${id}`);
      set({ currentDebate: response.data, isLoading: false });
      return response.data;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  vote: async (id, optionId) => {
    try {
      const response = await apiClient.post(`/debates/${id}/vote`, { optionId });
      // Update local state
      set((state) => {
        const updatedDebate = response.data;
        return {
          currentDebate: state.currentDebate?._id === id ? updatedDebate : state.currentDebate,
          debates: state.debates.map(d => d._id === id ? updatedDebate : d)
        };
      });
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  addComment: async (id, commentData) => {
     try {
       const response = await apiClient.post(`/debates/${id}/comments`, commentData);
       return response.data;
     } catch (error) {
       throw error;
     }
  },

  fetchComments: async (id, page = 1) => {
    try {
      const response = await apiClient.get(`/debates/${id}/comments?page=${page}&limit=50`);
      return response.data; // { comments, page, pages, total }
    } catch (error) {
      throw error;
    }
  }
}));

export default useDebateStore;
