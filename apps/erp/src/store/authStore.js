import { create } from 'zustand';
import { api, saveErpToken, clearErpToken } from '../api/client.js';

function canUseErp(user) {
  return Boolean(user?.apps?.includes('erp'));
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
    if (!canUseErp(data.user)) throw new Error('This account cannot sign in to the in-store ERP. Ask an admin to enable ERP System access.');
    saveErpToken(data.token);
    set({ user: data.user, ready: true });
    return data.user;
  },
  acceptSession(data) {
    if (!canUseErp(data.user)) throw new Error('This invite is not for the in-store ERP.');
    saveErpToken(data.token);
    set({ user: data.user, ready: true });
  },
  async logout() {
    await api.post('/auth/logout').catch(() => {});
    clearErpToken();
    set({ user: null });
  }
}));
