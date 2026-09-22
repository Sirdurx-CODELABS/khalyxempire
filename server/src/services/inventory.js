import { Product } from '../models/Product.js';
import { InventoryMovement } from '../models/InventoryMovement.js';
import { HttpError } from '../middleware/error.js';

export async function reserveStock(items, { orderId, channel = 'online' } = {}) {
  const reserved = [];
  try {
    for (const item of items) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: item.product,
          variants: {
            $elemMatch: {
              _id: item.variantId,
              stock: { $gte: item.qty }
            }
          }
        },
        {
          $inc: {
            'variants.$[v].stock': -item.qty,
            'variants.$[v].reserved': item.qty
          }
        },
        {
          arrayFilters: [{ 'v._id': item.variantId, 'v.stock': { $gte: item.qty } }],
          new: true
        }
      );

      if (!updated) {
        throw new HttpError(409, `${item.name || 'Item'} is out of stock`);
      }

      reserved.push(item);
      await InventoryMovement.create({
        type: 'reserve',
        channel,
        product: item.product,
        variantId: item.variantId,
        sku: item.sku,
        qty: -item.qty,
        order: orderId,
        note: 'Checkout reservation'
      });
    }
  } catch (err) {
    await releaseStock(reserved, { orderId, channel, note: 'Rollback after failed reservation' });
    throw err;
  }
  return reserved;
}

export async function commitStock(items, { orderId, channel = 'online' } = {}) {
  for (const item of items) {
    await Product.findOneAndUpdate(
      { _id: item.product, 'variants._id': item.variantId },
      { $inc: { 'variants.$[v].reserved': -item.qty } },
      { arrayFilters: [{ 'v._id': item.variantId }] }
    );
    await InventoryMovement.create({
      type: 'sale',
      channel,
      product: item.product,
      variantId: item.variantId,
      sku: item.sku,
      qty: -item.qty,
      order: orderId,
      note: 'Paid order'
    });
  }
}

export async function sellStock(items, { orderId, channel = 'pos', userId } = {}) {
  const sold = [];
  try {
    for (const item of items) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: item.product,
          variants: { $elemMatch: { _id: item.variantId, stock: { $gte: item.qty } } }
        },
        { $inc: { 'variants.$[v].stock': -item.qty } },
        { arrayFilters: [{ 'v._id': item.variantId, 'v.stock': { $gte: item.qty } }], new: true }
      );
      if (!updated) {
        throw new HttpError(409, `${item.name || 'Item'} is out of stock`);
      }
      sold.push(item);
      await InventoryMovement.create({
        type: 'sale',
        channel,
        product: item.product,
        variantId: item.variantId,
        sku: item.sku,
        qty: -item.qty,
        order: orderId,
        user: userId,
        note: 'POS sale'
      });
    }
  } catch (err) {
    await restoreSale(sold, { orderId, channel, note: 'POS rollback' });
    throw err;
  }
  return sold;
}

export async function restoreSale(items, { orderId, channel = 'online', note = 'Cancelled paid order' } = {}) {
  for (const item of items) {
    await Product.findOneAndUpdate(
      { _id: item.product, 'variants._id': item.variantId },
      { $inc: { 'variants.$[v].stock': item.qty } },
      { arrayFilters: [{ 'v._id': item.variantId }] }
    );
    await InventoryMovement.create({
      type: 'return',
      channel,
      product: item.product,
      variantId: item.variantId,
      sku: item.sku,
      qty: item.qty,
      order: orderId,
      note
    });
  }
}

const REASON_TYPE = {
  received: 'receive',
  damaged: 'adjustment',
  return: 'return',
  correction: 'adjustment'
};

const REASON_LABEL = {
  received: 'Received Stock',
  damaged: 'Damaged',
  return: 'Return',
  correction: 'Correction'
};

export async function adjustStock({ productId, variantId, qty, note = 'Manual adjustment', costPrice, userId, reason }) {
  let delta = Number(qty);
  if (!delta || Number.isNaN(delta)) throw new HttpError(400, 'Quantity change is required');
  if (reason && !REASON_TYPE[reason]) throw new HttpError(400, 'Invalid adjustment reason');
  if (reason === 'damaged' && delta > 0) delta = -delta;
  if ((reason === 'received' || reason === 'return') && delta < 0) {
    throw new HttpError(400, 'Use a positive quantity for this reason');
  }

  const filter =
    delta < 0
      ? {
          _id: productId,
          variants: { $elemMatch: { _id: variantId, stock: { $gte: Math.abs(delta) } } }
        }
      : { _id: productId, 'variants._id': variantId };

  const setCost =
    costPrice != null && costPrice !== ''
      ? { $set: { 'variants.$[v].costPrice': Number(costPrice) } }
      : {};

  const updated = await Product.findOneAndUpdate(
    filter,
    { $inc: { 'variants.$[v].stock': delta }, ...setCost },
    { arrayFilters: [{ 'v._id': variantId }], new: true }
  );

  if (!updated) throw new HttpError(409, 'Not enough stock for that adjustment');
  const variant = updated.variants.id(variantId);
  const type = REASON_TYPE[reason] || (delta > 0 ? 'receive' : 'adjustment');
  const fullNote = [reason ? REASON_LABEL[reason] : '', note].filter(Boolean).join(' · ') || 'Manual adjustment';
  await InventoryMovement.create({
    type,
    channel: 'system',
    product: productId,
    variantId,
    sku: variant?.sku,
    qty: delta,
    user: userId,
    reason: reason || '',
    note: fullNote
  });
  return updated;
}

export async function releaseStock(items, { orderId, channel = 'online', note = 'Released unpaid reservation' } = {}) {
  for (const item of items) {
    await Product.findOneAndUpdate(
      { _id: item.product, 'variants._id': item.variantId },
      {
        $inc: {
          'variants.$[v].stock': item.qty,
          'variants.$[v].reserved': -item.qty
        }
      },
      { arrayFilters: [{ 'v._id': item.variantId }] }
    );
    await InventoryMovement.create({
      type: 'release',
      channel,
      product: item.product,
      variantId: item.variantId,
      sku: item.sku,
      qty: item.qty,
      order: orderId,
      note
    });
  }
}
