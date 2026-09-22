import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { InventoryMovement } from '../models/InventoryMovement.js';
import { HttpError } from '../middleware/error.js';
import { catalogFilter } from './catalogSearch.js';
import { createSupplyRequest } from './suppliers.js';

const COUNTED = { status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } };

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n) {
  const x = startOfDay();
  x.setDate(x.getDate() - n);
  return x;
}

export function productStockStatus(variants = []) {
  const total = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  if (total <= 0) return 'out_of_stock';
  const low = variants.some((v) => (Number(v.stock) || 0) <= (v.lowStockThreshold ?? 5));
  return low ? 'low_stock' : 'in_stock';
}

export function productStockValue(variants = []) {
  return variants.reduce((sum, v) => sum + (Number(v.costPrice) || 0) * (Number(v.stock) || 0), 0);
}

export function toInventoryRow(product) {
  const doc = product.toObject ? product.toObject() : product;
  const variants = doc.variants || [];
  return {
    _id: doc._id,
    name: doc.name,
    slug: doc.slug,
    image: doc.images?.[0] || '',
    category: doc.category?.name || '',
    categoryId: doc.category?._id || doc.category,
    totalStock: variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0),
    reserved: variants.reduce((sum, v) => sum + (Number(v.reserved) || 0), 0),
    stockStatus: productStockStatus(variants),
    updatedAt: doc.updatedAt,
    stockValue: productStockValue(variants),
    suppliers: (doc.suppliers || []).map((s) => ({
      _id: s._id,
      name: s.name,
      status: s.status
    })),
    variantCount: variants.length
  };
}

export function inventoryStats(products = []) {
  let stockValue = 0;
  let lowCount = 0;
  let outCount = 0;
  const lowItems = [];
  for (const product of products) {
    const variants = product.variants || [];
    const status = productStockStatus(variants);
    stockValue += productStockValue(variants);
    if (status === 'low_stock') {
      lowCount += 1;
      lowItems.push(toInventoryRow(product));
    }
    if (status === 'out_of_stock') outCount += 1;
  }
  lowItems.sort((a, b) => a.totalStock - b.totalStock);
  return {
    productCount: products.length,
    stockValue,
    lowCount,
    outCount,
    lowItems
  };
}

function normalizeStatus(status) {
  if (status === 'low') return 'low_stock';
  if (status === 'out') return 'out_of_stock';
  if (status === 'in') return 'in_stock';
  return status || '';
}

export async function listInventory({ q, category, status, supplier } = {}) {
  const filter = catalogFilter(q, { activeOnly: false });
  if (category) filter.category = category;
  if (supplier) filter.suppliers = supplier;
  const products = await Product.find(filter)
    .populate('category', 'name slug')
    .populate('suppliers', 'name status')
    .sort({ name: 1 });

  const totals = inventoryStats(products);
  const wanted = normalizeStatus(status);
  const items = products.map(toInventoryRow).filter((row) => (wanted ? row.stockStatus === wanted : true));
  const valueByCategory = {};
  for (const row of items) {
    const key = row.category || 'Uncategorized';
    if (!valueByCategory[key]) valueByCategory[key] = { category: key, value: 0, products: 0, stock: 0 };
    valueByCategory[key].value += row.stockValue;
    valueByCategory[key].products += 1;
    valueByCategory[key].stock += row.totalStock;
  }

  return {
    items,
    stockValue: items.reduce((sum, row) => sum + row.stockValue, 0),
    totals,
    valueByCategory: Object.values(valueByCategory)
  };
}

function gallery(product) {
  const colorShots = (product.colorImages || []).flatMap((entry) => entry.images || []);
  return [...new Set([...(product.images || []), ...colorShots].filter(Boolean))];
}

async function salesPeriods(productId) {
  const id = new mongoose.Types.ObjectId(String(productId));
  const week = daysAgo(7);
  const month = daysAgo(30);
  const [agg] = await Order.aggregate([
    { $match: { ...COUNTED, 'items.product': id } },
    { $unwind: '$items' },
    { $match: { 'items.product': id } },
    {
      $group: {
        _id: null,
        unitsAll: { $sum: '$items.qty' },
        revenueAll: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
        unitsWeek: {
          $sum: { $cond: [{ $gte: [{ $ifNull: ['$paidAt', '$createdAt'] }, week] }, '$items.qty', 0] }
        },
        revenueWeek: {
          $sum: {
            $cond: [
              { $gte: [{ $ifNull: ['$paidAt', '$createdAt'] }, week] },
              { $multiply: ['$items.price', '$items.qty'] },
              0
            ]
          }
        },
        unitsMonth: {
          $sum: { $cond: [{ $gte: [{ $ifNull: ['$paidAt', '$createdAt'] }, month] }, '$items.qty', 0] }
        },
        revenueMonth: {
          $sum: {
            $cond: [
              { $gte: [{ $ifNull: ['$paidAt', '$createdAt'] }, month] },
              { $multiply: ['$items.price', '$items.qty'] },
              0
            ]
          }
        }
      }
    }
  ]);
  return {
    week: { units: agg?.unitsWeek || 0, revenue: agg?.revenueWeek || 0 },
    month: { units: agg?.unitsMonth || 0, revenue: agg?.revenueMonth || 0 },
    all: { units: agg?.unitsAll || 0, revenue: agg?.revenueAll || 0 }
  };
}

export async function getInventoryProduct(id) {
  if (!mongoose.isValidObjectId(String(id))) throw new HttpError(404, 'Product not found');
  const product = await Product.findById(id)
    .populate('category', 'name slug')
    .populate('suppliers', 'name status category contactName phone whatsapp');
  if (!product) throw new HttpError(404, 'Product not found');
  const [movements, sales] = await Promise.all([
    InventoryMovement.find({ product: id })
      .populate('user', 'name email')
      .populate('order', 'orderNumber channel')
      .sort({ createdAt: -1 })
      .limit(200),
    salesPeriods(id)
  ]);
  const variants = (product.variants || []).map((v) => {
    const stock = Number(v.stock) || 0;
    const threshold = v.lowStockThreshold ?? 5;
    return {
      ...v.toObject(),
      low: stock <= threshold,
      value: (Number(v.costPrice) || 0) * stock
    };
  });
  const row = toInventoryRow(product);
  const obj = product.toObject();
  return {
    product: {
      ...obj,
      ...row,
      category: obj.category,
      suppliers: obj.suppliers,
      images: gallery(product),
      variants
    },
    movements,
    sales
  };
}

export async function updateThresholds(id, variants = []) {
  const product = await Product.findById(id);
  if (!product) throw new HttpError(404, 'Product not found');
  for (const update of variants) {
    const variant = product.variants.id(update.variantId);
    if (!variant || update.lowStockThreshold == null || update.lowStockThreshold === '') continue;
    variant.lowStockThreshold = Math.max(0, Number(update.lowStockThreshold) || 0);
  }
  await product.save();
  return getInventoryProduct(id);
}

export async function requestProductSupply(id, user, { supplierId, message } = {}) {
  const product = await Product.findById(id).populate('suppliers', 'name status');
  if (!product) throw new HttpError(404, 'Product not found');
  const suppliers = product.suppliers || [];
  if (!suppliers.length) throw new HttpError(400, 'Link a supplier to this product first');
  const chosen =
    suppliers.find((s) => String(s._id) === String(supplierId)) ||
    suppliers.find((s) => s.status === 'approved') ||
    suppliers[0];
  const low = (product.variants || [])
    .filter((v) => (Number(v.stock) || 0) <= (v.lowStockThreshold ?? 5))
    .map((v) => `${v.sku} (${v.stock})`)
    .join(', ');
  const text =
    String(message || '').trim() ||
    `Please restock ${product.name}${low ? ` — low/out: ${low}` : ''}.`;
  return createSupplyRequest(chosen._id, user, text, 'admin');
}
