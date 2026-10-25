import { create } from 'zustand';
import apiClient from '@/services/api';

const useNotificationStore = create((set) => ({
  unreadCount: 0,

  fetchUnreadCount: async () => {
    try {
      const res = await apiClient.get('/notifications/unread-count');
      set({ unreadCount: res.data?.unreadCount || 0 });
    } catch {
      // The badge is non-critical; keep the previous value.
    }
  },

  increment: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  setUnreadCount: (unreadCount) => set({ unreadCount: Math.max(0, unreadCount) }),
  decrement: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
}));

export default useNotificationStore;
