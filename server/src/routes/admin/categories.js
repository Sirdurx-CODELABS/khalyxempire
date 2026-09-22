import { Router } from 'express';
import { slugify } from '@khalyx/shared';
import { Category } from '../../models/Category.js';
import { Product } from '../../models/Product.js';
import { HttpError } from '../../middleware/error.js';
import { requirePermission } from '../../middleware/admin.js';

const router = Router();
router.use(requirePermission('products'));

async function uniqueSlug(base, ignoreId) {
  let slug = slugify(base) || `category-${Date.now()}`;
  let n = 2;
  while (await Category.exists({ slug, ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) })) {
    slug = `${slugify(base)}-${n++}`;
  }
  return slug;
}

function parseSubs(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((s) => String(s || '').trim()).filter(Boolean))];
  }
  return [
    ...new Set(
      String(value || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    )
  ];
}

router.get('/', async (_req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 });
  const counts = await Product.aggregate([{ $group: { _id: '$category', products: { $sum: 1 } } }]);
  const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.products]));
  res.json({
    categories: categories.map((c) => ({
      ...c.toObject(),
      productCount: byId[String(c._id)] || 0
    }))
  });
});

router.post('/', async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw new HttpError(400, 'Name is required');
  const slug = await uniqueSlug(req.body.slug || name);
  const category = await Category.create({
    name,
    slug,
    description: String(req.body.description || '').trim(),
    image: String(req.body.image || '').trim(),
    subcategories: parseSubs(req.body.subcategories),
    sortOrder: Number(req.body.sortOrder) || 0
  });
  res.status(201).json({ category });
});

router.patch('/:id', async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new HttpError(404, 'Category not found');
  if (req.body.name != null) category.name = String(req.body.name).trim() || category.name;
  if (req.body.slug != null || req.body.name != null) {
    category.slug = await uniqueSlug(req.body.slug || category.name, category._id);
  }
  if (req.body.description != null) category.description = String(req.body.description).trim();
  if (req.body.image != null) category.image = String(req.body.image).trim();
  if (req.body.subcategories != null) category.subcategories = parseSubs(req.body.subcategories);
  if (req.body.sortOrder != null) category.sortOrder = Number(req.body.sortOrder) || 0;
  await category.save();
  res.json({ category });
});

router.delete('/:id', async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new HttpError(404, 'Category not found');
  const inUse = await Product.countDocuments({ category: category._id });
  if (inUse) throw new HttpError(400, `Cannot delete — ${inUse} product(s) still use this category`);
  await category.deleteOne();
  res.json({ ok: true });
});

export default router;
