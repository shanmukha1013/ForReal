import { create } from 'zustand';
import apiClient, { setAccessToken } from '@/services/api';
import { socketService } from '@/services/socket';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start true to check auth on load
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const token = response.data.accessToken;
      setAccessToken(token);
      socketService.connect(token);
      set({ user: response.data, isAuthenticated: true, isLoading: false });
      return response;
    } catch (error) {
      set({ error: error.message, isAuthenticated: false, isLoading: false });
      throw error;
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/register', userData);
      const token = response.data.accessToken;
      setAccessToken(token);
      socketService.connect(token);
      set({ user: response.data, isAuthenticated: true, isLoading: false });
      return response;
    } catch (error) {
      set({ error: error.message, isAuthenticated: false, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setAccessToken(null);
      socketService.disconnect();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      // First try to refresh the token, which will set it in the api interceptor
      const refreshResponse = await apiClient.post('/auth/refresh');
      const token = refreshResponse.data.accessToken;
      setAccessToken(token);
      socketService.connect(token);
      
      const response = await apiClient.get('/auth/me');
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch {
      // If unauthorized, just set state to null, don't throw
      setAccessToken(null);
      socketService.disconnect();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

export default useAuthStore;
