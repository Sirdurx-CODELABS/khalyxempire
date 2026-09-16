import { create } from 'zustand';
import { api, saveErpToken, clearErpToken } from '../api/client.js';

function canUseErp(user) {
  return Boolean(user?.apps?.includes('erp') || ['admin', 'staff'].includes(user?.role));
}

export const useErpAuth = create((set) => ({
  user: null,
  ready: false,
  async hydrate() {
    try {
      if (!localStorage.getItem('khalyx_erp_token')) {
        set({ ready: true, user: null });
        return;
      }
      const { data } = await api.get('/auth/me');
      if (!canUseErp(data.user)) {
        clearErpToken();
        set({ ready: true, user: null });
        return;
      }
      set({ user: data.user, ready: true });
    } catch {
      clearErpToken();
      set({ user: null, ready: true });
    }
  },
  async login(payload) {
    const { data } = await api.post('/auth/login', { ...payload, app: 'erp' });
    if (!canUseErp(data.user)) throw new Error('This account cannot sign in to ERP / POS');
    saveErpToken(data.token);
    set({ user: data.user });
    return data.user;
  },
  async logout() {
    await api.post('/auth/logout').catch(() => {});
    clearErpToken();
    set({ user: null });
  }
}));
