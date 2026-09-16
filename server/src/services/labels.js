import { Product } from '../models/Product.js';
import { LabelBatch } from '../models/LabelBatch.js';
import { HttpError } from '../middleware/error.js';

export function stickerFromVariant(product, variant, copies = 1) {
  return {
    productId: product._id,
    variantId: variant._id,
    name: product.name,
    sku: variant.sku,
    barcode: String(variant.barcode || variant.sku),
    size: variant.size || '',
    color: variant.color || '',
    price: variant.price,
    copies: Math.max(1, Number(copies) || 1)
  };
}

export function expandStickers(items = []) {
  const labels = [];
  for (const item of items) {
    const copies = Math.max(1, Number(item.copies) || 1);
    for (let i = 0; i < copies; i += 1) {
      labels.push({
        productId: item.productId,
        variantId: item.variantId,
        name: item.name,
        sku: item.sku,
        barcode: item.barcode,
        size: item.size,
        color: item.color,
        price: item.price,
        copies: 1,
        copyIndex: i + 1
      });
    }
  }
  return labels;
}

export function publicBatch(batch, { expand = false } = {}) {
  if (!batch) return null;
  const items = batch.items || [];
  return {
    id: batch._id,
    name: batch.name,
    notes: batch.notes || '',
    itemCount: items.length,
    stickerCount: items.reduce((sum, item) => sum + Math.max(1, Number(item.copies) || 1), 0),
    createdAt: batch.createdAt,
    createdBy: batch.createdBy?.name || batch.createdBy,
    items,
    labels: expand ? expandStickers(items) : undefined
  };
}

export async function itemsFromSelection(selection = []) {
  if (!Array.isArray(selection) || !selection.length) {
    throw new HttpError(400, 'Choose at least one product variant');
  }
  const items = [];
  for (const row of selection) {
    const product = await Product.findById(row.productId);
    if (!product) throw new HttpError(400, 'Product not found');
    const variant = product.variants.id(row.variantId) || product.variants.find((v) => String(v._id) === String(row.variantId));
    if (!variant) throw new HttpError(400, `Variant not found on ${product.name}`);
    items.push(stickerFromVariant(product, variant, row.copies));
  }
  return items;
}

export async function createLabelBatch({ name, notes, items, createdBy }) {
  const batchName = String(name || '').trim() || `Labels ${new Date().toLocaleDateString('en-NG')}`;
  if (!items?.length) throw new HttpError(400, 'Choose at least one product variant');
  const batch = await LabelBatch.create({
    name: batchName,
    notes: notes || '',
    createdBy,
    items
  });
  return batch;
}

export async function listLabelBatches({ q } = {}) {
  const filter = {};
  const term = String(q || '').trim();
  if (term) {
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { notes: rx }, { 'items.name': rx }, { 'items.sku': rx }, { 'items.barcode': rx }];
  }
  return LabelBatch.find(filter).populate('createdBy', 'name email').sort({ createdAt: -1 }).limit(80);
}
