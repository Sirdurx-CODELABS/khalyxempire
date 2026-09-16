import { create } from 'zustand';
import { api, erpClientId } from '../api/client.js';

const KEY = 'khalyx_erp_queue';

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function writeQueue(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export const useOffline = create((set, get) => ({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  queue: readQueue(),
  syncing: false,
  setOnline(online) {
    set({ online });
    if (online) get().flush();
  },
  enqueue(action, payload) {
    const item = {
      clientItemId: crypto.randomUUID(),
      action,
      payload,
      createdAt: new Date().toISOString()
    };
    const queue = [...get().queue, item];
    writeQueue(queue);
    set({ queue });
    return item;
  },
  async flush() {
    const queue = get().queue;
    if (!queue.length || get().syncing) return { flushed: 0 };
    set({ syncing: true });
    try {
      const { data } = await api.post('/erp/sync', { clientId: erpClientId(), items: queue });
      const failedIds = new Set((data.results || []).filter((r) => r.status === 'failed').map((r) => r.clientItemId));
      const remaining = queue.filter((i) => failedIds.has(i.clientItemId));
      writeQueue(remaining);
      set({ queue: remaining, syncing: false });
      return { flushed: queue.length - remaining.length, results: data.results };
    } catch {
      set({ syncing: false });
      return { flushed: 0, offline: true };
    }
  }
}));
