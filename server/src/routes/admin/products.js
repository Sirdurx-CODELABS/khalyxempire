import { Router } from 'express';
import { slugify } from '@khalyx/shared';
import { Product } from '../../models/Product.js';
import { HttpError } from '../../middleware/error.js';
import { requirePermission } from '../../middleware/admin.js';
import { catalogFilter } from '../../services/catalogSearch.js';

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

function variantPayload(v, index, name) {
  const sku =
    v.sku ||
    `KX-${slugify(name).replace(/-/g, '').slice(0, 8).toUpperCase() || 'ITEM'}-${index + 1}`;
  return {
    sku,
    size: v.size || 'OS',
    color: v.color || '',
    price: Number(v.price) || 0,
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

function normalizeVariants(variants, name) {
  const list = Array.isArray(variants) && variants.length ? variants : [{ price: 0, stock: 0 }];
  return list.map((v, i) => variantPayload(v, i, name));
}

router.get('/', async (req, res) => {
  const { q, category, page = 1, limit = 20 } = req.query;
  const filter = catalogFilter(q, { activeOnly: false });
  if (category) filter.category = category;
  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
  const [products, total] = await Promise.all([
    Product.find(filter).populate('category', 'name slug').sort({ updatedAt: -1 }).skip(skip).limit(Number(limit)),
    Product.countDocuments(filter)
  ]);
  res.json({ products, total, page: Number(page) });
});

router.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name slug subcategories');
  if (!product) throw new HttpError(404, 'Product not found');
  res.json({ product });
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
    isActive: body.isActive !== false,
    variants: normalizeVariants(body.variants, body.name)
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
    'isActive'
  ];
  for (const key of fields) {
    if (body[key] !== undefined) product[key] = body[key];
  }
  if (body.slug) {
    product.slug = await uniqueSlug(body.slug, product._id);
  } else if (nameChanged) {
    product.slug = await uniqueSlug(body.name, product._id);
  }
  if (body.variants) {
    product.variants = normalizeVariants(body.variants, product.name);
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
