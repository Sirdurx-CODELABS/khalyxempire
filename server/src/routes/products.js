import { Router } from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { catalogFilter } from '../services/catalogSearch.js';

const router = Router();

router.get('/', async (req, res) => {
  const {
    q,
    category,
    subcategory,
    minPrice,
    maxPrice,
    size,
    color,
    featured,
    newArrival,
    sort = 'newest',
    page = 1,
    limit = 12
  } = req.query;

  const filter = catalogFilter(q, { activeOnly: true });

  if (featured === 'true') filter.featured = true;
  if (newArrival === 'true') filter.newArrival = true;
  if (subcategory) filter.subcategory = subcategory;

  if (category) {
    const Category = (await import('../models/Category.js')).Category;
    const cat = mongoose.isValidObjectId(category)
      ? await Category.findById(category)
      : await Category.findOne({ slug: category });
    if (cat) filter.category = cat._id;
  }

  const variantMatch = {};
  if (minPrice) variantMatch.price = { ...(variantMatch.price || {}), $gte: Number(minPrice) };
  if (maxPrice) variantMatch.price = { ...(variantMatch.price || {}), $lte: Number(maxPrice) };
  if (size) variantMatch.size = size;
  if (color) variantMatch.color = { $regex: `^${color}$`, $options: 'i' };
  if (Object.keys(variantMatch).length) {
    filter.variants = { $elemMatch: variantMatch };
  }

  const sortMap = {
    newest: { createdAt: -1 },
    price_asc: { 'variants.0.price': 1 },
    price_desc: { 'variants.0.price': -1 },
    popular: { ratingAverage: -1, ratingCount: -1 }
  };

  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort(sortMap[sort] || sortMap.newest)
      .skip(skip)
      .limit(Math.min(48, Number(limit))),
    Product.countDocuments(filter)
  ]);

  const sizes = await Product.distinct('variants.size', { isActive: true, 'variants.size': { $ne: '' } });
  const colors = await Product.distinct('variants.color', { isActive: true, 'variants.color': { $ne: '' } });

  res.json({
    products: items,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    facets: { sizes: sizes.filter(Boolean), colors: colors.filter(Boolean) }
  });
});

router.get('/:slug', async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true }).populate('category', 'name slug');
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const reviews = await Review.find({ product: product._id }).populate('user', 'name').sort({ createdAt: -1 }).limit(20);
  res.json({ product, reviews });
});

export default router;
