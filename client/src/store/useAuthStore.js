import { create } from 'zustand';
import apiClient, { refreshAccessToken, setAccessToken } from '@/services/api';
import { socketService } from '@/services/socket';

// status: 'checking' while the session is restored on load, then
// 'authenticated' or 'guest'. Form submissions use isSubmitting so the login
// form never unmounts mid-request.
let checkPromise = null;

const useAuthStore = create((set, get) => ({
  user: null,
  status: 'checking',
  isSubmitting: false,

  login: async (credentials) => {
    set({ isSubmitting: true });
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const { accessToken, ...user } = response.data;
      setAccessToken(accessToken);
      socketService.connect();
      set({ user, status: 'authenticated', isSubmitting: false });
      return response;
    } catch (error) {
      set({ isSubmitting: false });
      throw error;
    }
  },

  register: async (userData) => {
    set({ isSubmitting: true });
    try {
      const response = await apiClient.post('/auth/register', userData);
      const { accessToken, ...user } = response.data;
      setAccessToken(accessToken);
      socketService.connect();
      set({ user, status: 'authenticated', isSubmitting: false });
      return response;
    } catch (error) {
      set({ isSubmitting: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Clearing local state below is what matters for the user.
    }
    get().clearSession();
  },

  // Local-only sign-out used when the server has already rejected the session.
  clearSession: () => {
    setAccessToken(null);
    socketService.disconnect();
    set({ user: null, status: 'guest', isSubmitting: false });
  },

  checkAuth: () => {
    // Deduplicated so StrictMode's double effect cannot race two refreshes.
    if (!checkPromise) {
      checkPromise = (async () => {
        try {
          await refreshAccessToken();
          const response = await apiClient.get('/auth/me');
          socketService.connect();
          set({ user: response.data, status: 'authenticated' });
        } catch {
          setAccessToken(null);
          socketService.disconnect();
          set({ user: null, status: 'guest' });
        } finally {
          checkPromise = null;
        }
      })();
    }
    return checkPromise;
  },

  // Patch the signed-in user after profile edits without a network round-trip.
  updateUser: (updates) => {
    const current = get().user;
    if (!current) return;
    set({
      user: {
        ...current,
        ...updates,
        profile: { ...(current.profile || {}), ...(updates.profile || {}) },
      },
    });
  },
}));

export default useAuthStore;
