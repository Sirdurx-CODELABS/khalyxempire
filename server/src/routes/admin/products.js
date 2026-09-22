import { Router } from 'express';
import mongoose from 'mongoose';
import { slugify } from '@khalyx/shared';
import { Product } from '../../models/Product.js';
import { Category } from '../../models/Category.js';
import { Supplier } from '../../models/Supplier.js';
import { Order } from '../../models/Order.js';
import { HttpError } from '../../middleware/error.js';
import { requirePermission } from '../../middleware/admin.js';
import { catalogFilter } from '../../services/catalogSearch.js';
import { sendCsv } from '../../utils/csv.js';
import { itemsFromSelection, createLabelBatch, publicBatch } from '../../services/labels.js';

const router = Router();
router.use(requirePermission('products'));

async function uniqueSlug(base, ignoreId) {
  let slug = slugify(base) || `product-${Date.now()}`;
  let n = 2;
  while (await Product.exists({ slug, ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) })) {
    slug = `${slugify(base)}-${n++}`;
  }
  return slug;
}

function variantPayload(v, index, name, basePrice = 0, baseCost = 0) {
  const sku =
    v.sku ||
    `KX-${slugify(name).replace(/-/g, '').slice(0, 8).toUpperCase() || 'ITEM'}-${index + 1}`;
  const price = v.price === '' || v.price === undefined || v.price === null ? Number(basePrice) || 0 : Number(v.price);
  return {
    sku,
    size: v.size || 'OS',
    color: v.color || '',
    price,
    costPrice: v.costPrice === '' || v.costPrice === undefined ? Number(baseCost) || 0 : Number(v.costPrice) || 0,
    compareAtPrice: Number(v.compareAtPrice) || 0,
    stock: Number(v.stock) || 0,
    reserved: Number(v.reserved) || 0,
    lowStockThreshold: Number(v.lowStockThreshold) || 5,
    barcode: v.barcode || sku,
    ...(v._id ? { _id: v._id } : {})
  };
}

function normalizeColorImages(colorImages, variants) {
  const allowed = new Set(
    (variants || [])
      .map((v) => String(v.color || '').trim())
      .filter(Boolean)
      .map((c) => c.toLowerCase())
  );
  const seen = new Set();
  return (Array.isArray(colorImages) ? colorImages : [])
    .map((entry) => ({
      color: String(entry?.color || '').trim(),
      images: (entry?.images || []).map((src) => String(src || '').trim()).filter(Boolean)
    }))
    .filter((entry) => {
      const key = entry.color.toLowerCase();
      if (!entry.color || !allowed.has(key) || !entry.images.length || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeVariants(variants, name, basePrice = 0, baseCost = 0) {
  const list = Array.isArray(variants) && variants.length ? variants : [{ price: basePrice, stock: 0 }];
  return list.map((v, i) => variantPayload(v, i, name, basePrice, baseCost));
}

function supplierIds(value) {
  return (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);
}

export function summarizeProduct(product) {
  const doc = product.toObject ? product.toObject() : product;
  const variants = doc.variants || [];
  const stock = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
  const prices = variants.map((v) => Number(v.price) || 0);
  const status = doc.status === 'draft' ? 'draft' : stock <= 0 ? 'out_of_stock' : 'active';
  return {
    ...doc,
    stock,
    priceMin: prices.length ? Math.min(...prices) : Number(doc.basePrice) || 0,
    priceMax: prices.length ? Math.max(...prices) : Number(doc.basePrice) || 0,
    displayStatus: status,
    supplierCount: (doc.suppliers || []).length
  };
}

async function salesFor(productId) {
  const id = new mongoose.Types.ObjectId(String(productId));
  const paid = { status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } };
  const [agg] = await Order.aggregate([
    { $match: paid },
    { $unwind: '$items' },
    { $match: { 'items.product': id } },
    { $group: { _id: null, units: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } }
  ]);
  const orders = await Order.find({ ...paid, 'items.product': id })
    .sort({ paidAt: -1, createdAt: -1 })
    .limit(12)
    .select('orderNumber channel total paidAt createdAt items');
  return { units: agg?.units || 0, revenue: agg?.revenue || 0, orders };
}

router.get('/', async (req, res) => {
  const { q, category, page = 1, limit = 100, status, supplier, newArrival, featured } = req.query;
  const filter = catalogFilter(q, { activeOnly: false });
  if (category) filter.category = category;
  if (supplier) filter.suppliers = supplier;
  if (newArrival === 'true') filter.newArrival = true;
  if (featured === 'true') filter.featured = true;
  if (status === 'draft') filter.status = 'draft';
  if (status === 'active') filter.status = { $ne: 'draft' };
  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
  const [found, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .populate('suppliers', 'name status category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Product.countDocuments(filter)
  ]);
  let products = found.map(summarizeProduct);
  if (status === 'out_of_stock') products = products.filter((p) => p.displayStatus === 'out_of_stock');
  if (status === 'active') products = products.filter((p) => p.displayStatus === 'active');
  res.json({ products, total, page: Number(page) });
});

router.get('/export/csv', async (_req, res) => {
  const products = await Product.find().populate('category', 'name slug');
  const rows = [];
  for (const p of products) {
    for (const v of p.variants) {
      rows.push({
        name: p.name,
        slug: p.slug,
        category: p.category?.slug || '',
        subcategory: p.subcategory,
        sku: v.sku,
        barcode: v.barcode,
        size: v.size,
        color: v.color,
        price: v.price,
        costPrice: v.costPrice || 0,
        stock: v.stock,
        status: p.status || (p.isActive ? 'active' : 'draft')
      });
    }
  }
  sendCsv(res, `khalyx-products-${Date.now()}.csv`, rows);
});

router.post('/import/csv', async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  if (!rows.length) throw new HttpError(400, 'No CSV rows');
  let created = 0;
  let updated = 0;
  for (const row of rows) {
    const cat = await Category.findOne({
      $or: [{ slug: row.category }, { name: row.category }]
    });
    if (!cat || !row.name) continue;
    const slug = row.slug || (await uniqueSlug(row.name));
    let product = await Product.findOne({ slug });
    const variant = {
      sku: row.sku || `KX-${Date.now()}`,
      barcode: row.barcode || row.sku || '',
      size: row.size || 'OS',
      color: row.color || '',
      price: Number(row.price) || 0,
      costPrice: Number(row.costPrice) || 0,
      stock: Number(row.stock) || 0
    };
    if (!product) {
      await Product.create({
        name: row.name,
        slug,
        category: cat._id,
        subcategory: row.subcategory || '',
        status: row.status || 'active',
        isActive: row.status !== 'draft',
        variants: [variant]
      });
      created += 1;
    } else {
      const existing = product.variants.find((v) => v.sku === variant.sku);
      if (existing) Object.assign(existing, variant);
      else product.variants.push(variant);
      await product.save();
      updated += 1;
    }
  }
  res.json({ created, updated });
});

router.get('/meta/suppliers', async (_req, res) => {
  const suppliers = await Supplier.find().select('name status category').sort({ name: 1 }).lean();
  res.json({ suppliers });
});

router.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name slug subcategories')
    .populate('suppliers', 'name status category contactName phone whatsapp');
  if (!product) throw new HttpError(404, 'Product not found');
  const sales = await salesFor(product._id);
  res.json({ product: summarizeProduct(product), sales });
});

router.post('/:id/duplicate', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError(404, 'Product not found');
  const copy = product.toObject();
  delete copy._id;
  copy.name = `${product.name} (copy)`;
  copy.slug = await uniqueSlug(copy.name);
  copy.status = 'draft';
  copy.isActive = false;
  copy.featured = false;
  copy.variants = (copy.variants || []).map((v) => {
    const next = { ...v };
    delete next._id;
    return next;
  });
  const created = await Product.create(copy);
  res.status(201).json({ product: created });
});

router.post('/:id/labels', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError(404, 'Product not found');
  const wanted = Array.isArray(req.body.variantIds) && req.body.variantIds.length
    ? product.variants.filter((v) => req.body.variantIds.map(String).includes(String(v._id)))
    : product.variants;
  if (!wanted.length) throw new HttpError(400, 'Select at least one variant');
  const copies = Math.max(1, Number(req.body.copies) || 1);
  const selection = wanted.map((variant) => ({
    productId: product._id,
    variantId: variant._id,
    copies
  }));
  const batch = await createLabelBatch({
    name: req.body.name || `${product.name} barcodes`,
    notes: req.body.notes || '',
    items: await itemsFromSelection(selection),
    createdBy: req.user._id,
    labelSize: req.body.labelSize
  });
  res.status(201).json({ batch: publicBatch(batch, { expand: true }) });
});

router.post('/', async (req, res) => {
  const body = req.body;
  if (!body.name || !body.category) throw new HttpError(400, 'Name and category are required');
  const product = await Product.create({
    name: body.name,
    slug: body.slug ? await uniqueSlug(body.slug) : await uniqueSlug(body.name),
    description: body.description || '',
    seoTitle: body.seoTitle || `${body.name} | Khalyx Empire`,
    seoDescription: (body.seoDescription || body.description || '').slice(0, 160),
    category: body.category,
    subcategory: body.subcategory || '',
    images: body.images || [],
    colorImages: normalizeColorImages(body.colorImages, body.variants),
        tags: body.tags || [],
    featured: Boolean(body.featured),
    newArrival: Boolean(body.newArrival),
    suppliers: supplierIds(body.suppliers),
    basePrice: Number(body.basePrice) || 0,
    costPrice: Number(body.costPrice) || 0,
    isActive: body.status === 'draft' ? false : body.isActive !== false,
    status: body.status || (body.isActive === false ? 'draft' : 'active'),
    variants: normalizeVariants(body.variants, body.name, body.basePrice, body.costPrice)
  });
  res.status(201).json({ product });
});

router.patch('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError(404, 'Product not found');
  const body = req.body;
  const nameChanged = body.name && body.name !== product.name;
  const fields = [
    'name',
    'description',
    'seoTitle',
    'seoDescription',
    'category',
    'subcategory',
    'images',
    'colorImages',
    'tags',
    'featured',
    'newArrival',
    'isActive',
    'status',
    'basePrice',
    'costPrice'
  ];
  for (const key of fields) {
    if (body[key] !== undefined) product[key] = body[key];
  }
  if (body.suppliers !== undefined) product.suppliers = supplierIds(body.suppliers);
  if (body.slug) {
    product.slug = await uniqueSlug(body.slug, product._id);
  } else if (nameChanged) {
    product.slug = await uniqueSlug(body.name, product._id);
  }
  if (body.status === 'draft') product.isActive = false;
  if (body.status === 'active') product.isActive = true;
  if (body.variants) {
    product.variants = normalizeVariants(body.variants, product.name, product.basePrice, product.costPrice);
    const allOut = product.variants.every((v) => v.stock <= 0);
    if (product.status === 'active' && allOut) product.status = 'out_of_stock';
    if (product.status === 'out_of_stock' && !allOut) product.status = 'active';
  }
  if (body.colorImages !== undefined || body.variants) {
    product.colorImages = normalizeColorImages(body.colorImages ?? product.colorImages, product.variants);
  }
  await product.save();
  res.json({ product });
});

router.delete('/:id', async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new HttpError(404, 'Product not found');
  res.json({ ok: true });
});

export default router;
