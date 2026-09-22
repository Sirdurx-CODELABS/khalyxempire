import crypto from 'node:crypto';
import { generateOrderNumber } from '@khalyx/shared';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { Coupon } from '../models/Coupon.js';
import { HeldSale } from '../models/HeldSale.js';
import { HttpError } from '../middleware/error.js';
import { sellStock } from './inventory.js';
import { publicOrder } from './orders.js';
import { applyCoupon } from './pricing.js';
import { sendOrderEmail } from './email.js';
import { searchVariants, searchProducts, toVariantHit } from './catalogSearch.js';
import { computeBulkDiscount } from '@khalyx/shared';
import { getStoreSettings, publicPosSettings } from './settings.js';

const POS_METHODS = ['cash', 'card', 'transfer', 'account'];

export async function lookupCatalog(q) {
  return searchVariants(q, { limit: 30 });
}

export async function posCatalog({ q, category, limit = 48 } = {}) {
  const extra = {};
  if (category) extra.category = category;
  const term = String(q || '').trim();
  const { products } = await searchProducts(term, { activeOnly: true, limit, extra });
  const cards = products.map((product) => {
    const variants = (product.variants || []).map((variant) => toVariantHit(product, variant));
    const stock = variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0);
    const prices = variants.map((variant) => Number(variant.price) || 0);
    return {
      productId: product._id,
      name: product.name,
      image: product.images?.[0] || variants[0]?.image || '',
      category: product.category?.name || '',
      categoryId: product.category?._id || product.category,
      priceFrom: prices.length ? Math.min(...prices) : 0,
      stock,
      variantCount: variants.length,
      variants
    };
  });
  const needle = term.toLowerCase();
  const exact = needle
    ? cards.flatMap((card) => card.variants).find((hit) => String(hit.barcode).toLowerCase() === needle || String(hit.sku).toLowerCase() === needle)
    : null;
  return { products: cards, exact, settings: publicPosSettings(await getStoreSettings()) };
}

async function snapshotItems(rawItems) {
  if (!rawItems?.length) throw new HttpError(400, 'Add at least one item');
  const items = [];
  for (const line of rawItems) {
    const qty = Math.max(1, Number(line.qty) || 1);
    const product = await Product.findById(line.productId);
    if (!product || (!product.isActive && product.status === 'draft')) throw new HttpError(404, 'Product not found');
    let variant = line.variantId ? product.variants.id(line.variantId) : null;
    if (!variant && (line.sku || line.barcode)) {
      variant = product.variants.find(
        (v) => (line.sku && v.sku === line.sku) || (line.barcode && v.barcode === line.barcode)
      );
    }
    if (!variant) throw new HttpError(400, `Variant missing for ${product.name}`);
    if (variant.stock < qty) throw new HttpError(409, `${product.name} is out of stock`);
    const colorKey = String(variant.color || '').toLowerCase();
    const colorShot = product.colorImages?.find((entry) => String(entry.color || '').toLowerCase() === colorKey)?.images?.[0];
    items.push({
      product: product._id,
      variantId: variant._id,
      name: product.name,
      image: colorShot || product.images[0] || '',
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      price: Number(line.price) || variant.price,
      costPrice: variant.costPrice || 0,
      qty,
      category: product.category
    });
  }
  return items;
}

function normalizePayments(payments, paymentMethod, tendered, total) {
  if (Array.isArray(payments) && payments.length) {
    const rows = payments
      .map((p) => ({
        method: POS_METHODS.includes(p.method) ? p.method : 'cash',
        amount: Math.max(0, Number(p.amount) || 0),
        tendered: Math.max(0, Number(p.tendered) || Number(p.amount) || 0)
      }))
      .filter((p) => p.amount > 0);
    const sum = rows.reduce((s, p) => s + p.amount, 0);
    if (Math.abs(sum - total) > 1) throw new HttpError(400, 'Split payments must add up to the total');
    return rows.map((p) => ({ ...p, change: p.method === 'cash' ? Math.max(0, p.tendered - p.amount) : 0 }));
  }
  const method = POS_METHODS.includes(paymentMethod) ? paymentMethod : 'cash';
  const cashTendered = method === 'cash' ? Number(tendered) || total : total;
  if (method === 'cash' && cashTendered < total) throw new HttpError(400, 'Cash tendered is less than the total');
  return [
    {
      method,
      amount: total,
      tendered: cashTendered,
      change: Math.max(0, cashTendered - total)
    }
  ];
}

export async function completePosSale({
  staff,
  items: rawItems,
  discount = 0,
  manualDiscount = 0,
  couponCode,
  paymentMethod,
  payments,
  tendered = 0,
  customerId,
  customerName,
  customerPhone,
  customerEmail,
  note,
  emailReceipt
}) {
  const items = await snapshotItems(rawItems);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const store = publicPosSettings(await getStoreSettings());
  const bulk = computeBulkDiscount(
    items.map((item) => ({ productId: item.product, variantId: item.variantId, qty: item.qty, price: item.price })),
    store.posBulk
  );
  let coupon = null;
  let couponAmt = 0;
  if (couponCode) {
    const applied = await applyCoupon(couponCode, Math.max(0, subtotal - bulk.amount), items);
    coupon = applied.coupon;
    couponAmt = applied.discount;
  }
  const extra = Math.max(0, Number(manualDiscount) || Number(discount) || 0);
  const discountBreakdown = [
    bulk.amount
      ? { type: 'bulk', label: `Bulk Discount (${bulk.percent}%)`, amount: bulk.amount }
      : null,
    couponAmt ? { type: 'coupon', label: `Coupon ${coupon.code}`, amount: couponAmt } : null,
    extra ? { type: 'manual', label: 'Manual discount', amount: extra } : null
  ].filter(Boolean);
  const discountAmt = Math.min(
    subtotal,
    discountBreakdown.reduce((sum, row) => sum + row.amount, 0)
  );
  const total = Math.max(0, subtotal - discountAmt);
  const payRows = normalizePayments(payments, paymentMethod, tendered, total);
  const isSplit = payRows.length > 1 || payRows.some((p) => p.method === 'account');
  let patron = null;
  if (customerId) {
    const { User } = await import('../models/User.js');
    const { ROLES } = await import('@khalyx/shared');
    patron = await User.findById(customerId);
    if (!patron || patron.role !== ROLES.CUSTOMER) throw new HttpError(400, 'Select a registered customer');
  }
  if (isSplit && !patron) {
    throw new HttpError(400, 'Split payment is only available for a registered customer');
  }
  const onAccount = payRows.filter((p) => p.method === 'account').reduce((s, p) => s + p.amount, 0);
  if (onAccount && patron) {
    patron.accountBalance = (patron.accountBalance || 0) + onAccount;
    await patron.save();
  }
  const primary = payRows[0];

  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    user: patron?._id,
    guestName: patron?.name || customerName || 'Walk-in',
    guestPhone: patron?.phone || customerPhone || '',
    guestEmail: patron?.email || customerEmail || '',
    channel: 'pos',
    status: 'paid',
    payment: {
      provider: primary.method,
      reference: `POS-${crypto.randomBytes(6).toString('hex')}`,
      status: 'success',
      amount: total,
      tendered: primary.tendered,
      change: payRows.reduce((s, p) => s + (p.change || 0), 0)
    },
    payments: payRows,
    items: items.map(({ category, ...rest }) => rest),
    subtotal,
    discount: discountAmt,
    discountBreakdown,
    bulkDiscount: bulk.amount,
    shippingFee: 0,
    total,
    couponCode: coupon?.code || note || '',
    paidAt: new Date(),
    soldBy: staff?._id
  });

  try {
    await sellStock(order.items, { orderId: order._id, channel: 'pos', userId: staff?._id });
  } catch (err) {
    await order.deleteOne();
    throw err;
  }

  if (coupon) await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });
  if (emailReceipt && order.guestEmail) {
    await sendOrderEmail(order).catch(() => {});
  }

  return publicOrder(await order.populate('soldBy', 'name email'));
}

export async function holdSale(staff, payload) {
  if (!payload?.items?.length) throw new HttpError(400, 'Nothing to hold');
  const held = await HeldSale.create({ staff: staff._id, ...payload });
  return held;
}

export async function listHeldSales(staff) {
  return HeldSale.find({ staff: staff._id }).sort({ updatedAt: -1 }).limit(20);
}

export async function resumeHeldSale(staff, id) {
  const held = await HeldSale.findOne({ _id: id, staff: staff._id });
  if (!held) throw new HttpError(404, 'Held sale not found');
  await held.deleteOne();
  return held;
}
