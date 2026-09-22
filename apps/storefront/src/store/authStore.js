import { create } from 'zustand';
import { api, saveToken, clearToken } from '../api/client.js';

export const useAuth = create((set, get) => ({
  user: null,
  ready: false,
  async hydrate() {
    try {
      if (!localStorage.getItem('khalyx_token')) {
        set({ ready: true, user: null });
        return;
      }
      const { data } = await api.get('/auth/me');
      set({ user: data.user, ready: true });
    } catch {
      clearToken();
      set({ user: null, ready: true });
    }
  },
  setUser(user) {
    set({ user });
  },
  async login(payload) {
    const { data } = await api.post('/auth/login', { ...payload, app: 'storefront' });
    if (data.user && !data.user.apps?.includes('storefront') && data.user.role !== 'customer') {
      throw new Error('This account cannot sign in to the online store');
    }
    saveToken(data.token);
    set({ user: data.user });
    return data.user;
  },
  async register(payload) {
    const { data } = await api.post('/auth/register', payload);
    saveToken(data.token);
    set({ user: data.user });
    return data.user;
  },
  async logout() {
    await api.post('/auth/logout').catch(() => {});
    clearToken();
    set({ user: null });
  },
  isAuthed: () => Boolean(get().user)
}));
