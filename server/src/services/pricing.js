import { Coupon } from '../models/Coupon.js';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/error.js';

export function shippingFor(subtotal) {
  if (subtotal >= env.freeShippingThreshold) return 0;
  return env.shippingFee;
}

export async function applyCoupon(code, subtotal) {
  if (!code) return { discount: 0, coupon: null };
  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), isActive: true });
  if (!coupon) throw new HttpError(400, 'Invalid coupon');
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new HttpError(400, 'Coupon expired');
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new HttpError(400, 'Coupon fully used');
  if (subtotal < coupon.minSubtotal) {
    throw new HttpError(400, `Coupon requires a ${coupon.minSubtotal} NGN subtotal`);
  }
  const discount =
    coupon.type === 'percent' ? Math.round((subtotal * coupon.value) / 100) : Math.min(coupon.value, subtotal);
  return { discount, coupon };
}

export function totals({ subtotal, discount = 0 }) {
  const shippingFee = shippingFor(Math.max(0, subtotal - discount));
  const total = Math.max(0, subtotal - discount + shippingFee);
  return { subtotal, discount, shippingFee, total };
}
