import { create } from 'zustand';
import apiClient, { setAccessToken } from '@/services/api';
import { socketService } from '@/services/socket';

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/login', credentials);
      // response = { success, message, data: { _id, username, email, role, profile, accessToken } }
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
      console.error('Logout error:', error);
    } finally {
      setAccessToken(null);
      socketService.disconnect();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const refreshResponse = await apiClient.post('/auth/refresh');
      const token = refreshResponse.data.accessToken;
      setAccessToken(token);
      socketService.connect(token);

      const response = await apiClient.get('/auth/me');
      // response.data = { _id, username, email, role, profile, credibilityScore, badges }
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch {
      setAccessToken(null);
      socketService.disconnect();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  // Directly update user fields in the store — used after profile edits to avoid a full checkAuth round-trip
  updateUser: (updates) => {
    const currentUser = get().user;
    if (!currentUser) return;
    set({
      user: {
        ...currentUser,
        ...updates,
        profile: {
          ...(currentUser.profile || {}),
          ...(updates.profile || {}),
        },
      },
    });
  },
}));

export default useAuthStore;
