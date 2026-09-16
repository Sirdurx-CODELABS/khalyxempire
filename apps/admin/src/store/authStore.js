import { create } from 'zustand';
import { api, saveAdminToken, clearAdminToken } from '../api/client.js';

function canUseAdmin(user) {
  return Boolean(user?.apps?.includes('admin') || user?.role === 'admin');
}

export const useAdminAuth = create((set, get) => ({
  user: null,
  ready: false,
  async hydrate() {
    try {
      if (!localStorage.getItem('khalyx_admin_token')) {
        set({ ready: true, user: null });
        return;
      }
      const { data } = await api.get('/auth/me');
      if (!canUseAdmin(data.user)) {
        clearAdminToken();
        set({ ready: true, user: null });
        return;
      }
      set({ user: data.user, ready: true });
    } catch {
      clearAdminToken();
      set({ user: null, ready: true });
    }
  },
  async login(payload) {
    const { data } = await api.post('/auth/login', { ...payload, app: 'admin' });
    if (!canUseAdmin(data.user)) {
      throw new Error('This account cannot sign in to the admin dashboard');
    }
    saveAdminToken(data.token);
    set({ user: data.user });
    return data.user;
  },
  async logout() {
    await api.post('/auth/logout').catch(() => {});
    clearAdminToken();
    set({ user: null });
  },
  can(permission) {
    const user = get().user;
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions?.includes(permission);
  }
}));
