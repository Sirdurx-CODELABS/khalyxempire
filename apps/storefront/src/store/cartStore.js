import { create } from 'zustand';
import { api } from '../api/client.js';

export const useCart = create((set, get) => ({
  items: [],
  subtotal: 0,
  itemCount: 0,
  toast: '',
  async refresh() {
    const { data } = await api.get('/cart');
    set({ items: data.items, subtotal: data.subtotal, itemCount: data.itemCount });
    return data;
  },
  async add({ productId, variantId, qty = 1 }) {
    const { data } = await api.post('/cart/items', { productId, variantId, qty });
    set({ items: data.items, subtotal: data.subtotal, itemCount: data.itemCount, toast: 'Added to bag' });
    setTimeout(() => set({ toast: '' }), 1800);
    return data;
  },
  async updateQty(itemId, qty) {
    const { data } = await api.patch(`/cart/items/${itemId}`, { qty });
    set({ items: data.items, subtotal: data.subtotal, itemCount: data.itemCount });
  },
  async remove(itemId) {
    const { data } = await api.delete(`/cart/items/${itemId}`);
    set({ items: data.items, subtotal: data.subtotal, itemCount: data.itemCount });
  },
  flash(message) {
    set({ toast: message });
    setTimeout(() => set({ toast: '' }), 1800);
  }
}));
