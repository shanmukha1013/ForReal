import { create } from 'zustand';

// Promise-based replacement for window.confirm, rendered by <ConfirmHost />.
const useConfirmStore = create((set, get) => ({
  request: null,

  confirm: ({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'default' }) =>
    new Promise((resolve) => {
      get().request?.resolve(false);
      set({ request: { title, message, confirmLabel, cancelLabel, tone, resolve } });
    }),

  settle: (value) => {
    const { request } = get();
    if (!request) return;
    request.resolve(value);
    set({ request: null });
  },
}));

export const confirmAction = (options) => useConfirmStore.getState().confirm(options);

export default useConfirmStore;
