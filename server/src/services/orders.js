import crypto from 'node:crypto';
import { generateOrderNumber } from '@khalyx/shared';
import { Order } from '../models/Order.js';
import { Cart } from '../models/Cart.js';
import { Coupon } from '../models/Coupon.js';
import { HttpError } from '../middleware/error.js';
import { commitStock, releaseStock, reserveStock, restoreSale } from './inventory.js';
import { applyCoupon, totals } from './pricing.js';
import { initializePayment } from './payment/index.js';
import { sendOrderEmail } from './email.js';
import { buildWhatsAppLink } from './whatsapp.js';

export async function expireStaleOrders() {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const stale = await Order.find({ status: 'pending', createdAt: { $lt: cutoff }, stockReserved: true });
  for (const order of stale) {
    await releaseStock(order.items, { orderId: order._id, note: 'Expired unpaid order' });
    order.status = 'cancelled';
    order.payment.status = 'expired';
    order.stockReserved = false;
    await order.save();
  }
}

export async function createCheckout({ cart, user, contact, address, paymentProvider, couponCode }) {
  await expireStaleOrders();
  if (!cart.items.length) throw new HttpError(400, 'Your cart is empty');

  const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const { discount, coupon } = await applyCoupon(couponCode, subtotal);
  const money = totals({ subtotal, discount });

  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    user: user?._id,
    guestEmail: contact.email,
    guestName: contact.name,
    guestPhone: contact.phone,
    channel: 'online',
    status: 'pending',
    payment: {
      provider: paymentProvider || 'simulate',
      reference: `KX-${crypto.randomBytes(8).toString('hex')}`,
      status: 'pending',
      amount: money.total
    },
    items: cart.items.map((i) => ({
      product: i.product,
      variantId: i.variantId,
      name: i.name,
      image: i.image,
      sku: i.sku,
      size: i.size,
      color: i.color,
      price: i.price,
      qty: i.qty
    })),
    shippingAddress: address,
    ...money,
    couponCode: coupon?.code || '',
    stockReserved: false
  });

  order.whatsappLink = buildWhatsAppLink(order);
  await order.save();

  try {
    await reserveStock(order.items, { orderId: order._id, channel: 'online' });
    order.stockReserved = true;
    await order.save();
  } catch (err) {
    order.status = 'cancelled';
    order.payment.status = 'failed';
    await order.save();
    throw err;
  }

  const payment = await initializePayment(order, paymentProvider);
  order.payment.provider = payment.provider;
  order.payment.reference = payment.reference || order.payment.reference;
  await order.save();

  if (payment.simulate) {
    await markOrderPaid(order, { provider: 'simulate', reference: order.payment.reference });
    await Cart.findByIdAndUpdate(cart._id, { items: [] });
    return { order, payment: { ...payment, simulate: true, alreadyPaid: true } };
  }

  return { order, payment };
}

export async function markOrderPaid(order, { provider, reference, raw } = {}) {
  if (order.status === 'paid' || order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered') {
    return order;
  }
  if (order.status === 'cancelled') {
    throw new HttpError(409, 'Order was cancelled');
  }

  if (order.stockReserved) {
    await commitStock(order.items, { orderId: order._id, channel: order.channel });
    order.stockReserved = false;
  }

  order.status = 'paid';
  order.payment.status = 'success';
  order.payment.provider = provider || order.payment.provider;
  order.payment.reference = reference || order.payment.reference;
  if (raw) order.payment.raw = raw;
  order.paidAt = new Date();
  await order.save();

  if (order.couponCode) {
    await Coupon.updateOne({ code: order.couponCode }, { $inc: { usedCount: 1 } });
  }

  if (order.user) {
    await Cart.findOneAndUpdate({ user: order.user }, { items: [] });
  }

  await sendOrderEmail(order);
  return order;
}

export async function cancelUnpaidOrder(order) {
  if (order.status !== 'pending') return order;
  if (order.stockReserved) {
    await releaseStock(order.items, { orderId: order._id });
    order.stockReserved = false;
  }
  order.status = 'cancelled';
  order.payment.status = 'cancelled';
  await order.save();
  return order;
}

const PAID_LIKE = ['paid', 'processing', 'shipped', 'delivered'];

export async function setOrderStatus(order, status) {
  if (order.status === status) return order;
  if (order.status === 'cancelled') throw new HttpError(409, 'Cancelled orders cannot change status');
  if (status === 'cancelled') {
    if (order.status === 'pending') return cancelUnpaidOrder(order);
    if (PAID_LIKE.includes(order.status)) {
      await restoreSale(order.items, { orderId: order._id, channel: order.channel });
    }
    order.status = 'cancelled';
    await order.save();
    return order;
  }
  order.status = status;
  await order.save();
  return order;
}

export async function refundOrder(order, { amount, note } = {}) {
  if (!PAID_LIKE.includes(order.status) && order.status !== 'cancelled') {
    throw new HttpError(400, 'Only paid orders can be refunded');
  }
  const remaining = Math.max(0, order.total - (order.refundedAmount || 0));
  const amt = amount == null || amount === '' ? remaining : Math.min(remaining, Number(amount) || 0);
  if (amt <= 0) throw new HttpError(400, 'Nothing left to refund');
  if (amt >= remaining) {
    await restoreSale(order.items, { orderId: order._id, channel: order.channel, note: note || 'Refund' });
    order.status = 'cancelled';
    order.payment.status = 'refunded';
  }
  order.refundedAmount = (order.refundedAmount || 0) + amt;
  order.refundNote = note || '';
  order.refundedAt = new Date();
  await order.save();
  return order;
}

export function publicOrder(order) {
  return {
    id: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    channel: order.channel,
    payment: {
      provider: order.payment.provider,
      status: order.payment.status,
      reference: order.payment.reference,
      tendered: order.payment.tendered,
      change: order.payment.change,
      amount: order.payment.amount
    },
    payments: order.payments || [],
    refundedAmount: order.refundedAmount || 0,
    refundNote: order.refundNote || '',
    refundedAt: order.refundedAt,
    items: order.items,
    shippingAddress: order.shippingAddress,
    guestEmail: order.guestEmail,
    guestName: order.guestName,
    guestPhone: order.guestPhone,
    user: order.user,
    soldBy: order.soldBy,
    subtotal: order.subtotal,
    discount: order.discount,
    bulkDiscount: order.bulkDiscount || 0,
    discountBreakdown: order.discountBreakdown || [],
    shippingFee: order.shippingFee,
    total: order.total,
    couponCode: order.couponCode,
    whatsappLink: order.whatsappLink,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}
