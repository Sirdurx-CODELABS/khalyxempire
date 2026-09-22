import { Coupon } from '../models/Coupon.js';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/error.js';
import { getStoreSettings, publicStoreProfile } from './settings.js';

export function shippingFor(subtotal, store = null) {
  const fee = store?.shippingFee != null ? Number(store.shippingFee) : env.shippingFee;
  const freeAt =
    store?.freeShippingThreshold != null ? Number(store.freeShippingThreshold) : env.freeShippingThreshold;
  if (subtotal >= freeAt) return 0;
  return Math.max(0, fee);
}

export async function applyCoupon(code, subtotal, items = []) {
  if (!code) return { discount: 0, coupon: null };
  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), isActive: true });
  if (!coupon) throw new HttpError(400, 'Invalid coupon');
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new HttpError(400, 'Coupon expired');
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new HttpError(400, 'Coupon fully used');
  if (subtotal < coupon.minSubtotal) {
    throw new HttpError(400, `Coupon requires a ${coupon.minSubtotal} NGN subtotal`);
  }
  if (coupon.productIds?.length) {
    const allowed = new Set(coupon.productIds.map((id) => String(id)));
    const ok = items.some((item) => allowed.has(String(item.product || item.productId)));
    if (!ok) throw new HttpError(400, 'Coupon does not apply to these products');
  }
  if (coupon.categoryIds?.length) {
    const allowed = new Set(coupon.categoryIds.map((id) => String(id)));
    const ok = items.some((item) => allowed.has(String(item.category || item.categoryId)));
    if (!ok) throw new HttpError(400, 'Coupon does not apply to this category');
  }
  const discount =
    coupon.type === 'percent' ? Math.round((subtotal * coupon.value) / 100) : Math.min(coupon.value, subtotal);
  return { discount, coupon };
}

export function totals({ subtotal, discount = 0, store = null }) {
  const shippingFee = shippingFor(Math.max(0, subtotal - discount), store);
  const total = Math.max(0, subtotal - discount + shippingFee);
  return { subtotal, discount, shippingFee, total };
}

export async function totalsWithSettings({ subtotal, discount = 0 }) {
  const settings = await getStoreSettings();
  const { store } = publicStoreProfile(settings);
  return totals({ subtotal, discount, store });
}
