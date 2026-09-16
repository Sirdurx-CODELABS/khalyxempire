import crypto from 'node:crypto';
import { generateOrderNumber } from '@khalyx/shared';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { HttpError } from '../middleware/error.js';
import { sellStock } from './inventory.js';
import { publicOrder } from './orders.js';

import { searchVariants } from './catalogSearch.js';

const POS_METHODS = ['cash', 'card', 'transfer'];

export async function lookupCatalog(q) {
  return searchVariants(q, { limit: 30 });
}

async function snapshotItems(rawItems) {
  if (!rawItems?.length) throw new HttpError(400, 'Add at least one item');
  const items = [];
  for (const line of rawItems) {
    const qty = Math.max(1, Number(line.qty) || 1);
    const product = await Product.findById(line.productId);
    if (!product || !product.isActive) throw new HttpError(404, 'Product not found');
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
      qty
    });
  }
  return items;
}

export async function completePosSale({ staff, items: rawItems, discount = 0, paymentMethod, tendered = 0, customerName, customerPhone, note }) {
  const method = POS_METHODS.includes(paymentMethod) ? paymentMethod : 'cash';
  const items = await snapshotItems(rawItems);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discountAmt = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const total = subtotal - discountAmt;
  const cashTendered = method === 'cash' ? Number(tendered) || total : total;
  if (method === 'cash' && cashTendered < total) {
    throw new HttpError(400, 'Cash tendered is less than the total');
  }

  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    guestName: customerName || 'Walk-in',
    guestPhone: customerPhone || '',
    channel: 'pos',
    status: 'paid',
    payment: {
      provider: method,
      reference: `POS-${crypto.randomBytes(6).toString('hex')}`,
      status: 'success',
      amount: total,
      tendered: cashTendered,
      change: Math.max(0, cashTendered - total)
    },
    items,
    subtotal,
    discount: discountAmt,
    shippingFee: 0,
    total,
    couponCode: note || '',
    paidAt: new Date(),
    soldBy: staff?._id
  });

  try {
    await sellStock(items, { orderId: order._id, channel: 'pos' });
  } catch (err) {
    await order.deleteOne();
    throw err;
  }

  return publicOrder(await order.populate('soldBy', 'name email'));
}
