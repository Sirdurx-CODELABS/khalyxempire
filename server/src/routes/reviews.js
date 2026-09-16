import { Router } from 'express';
import { Review } from '../models/Review.js';
import { Product } from '../models/Product.js';
import { protect } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

router.get('/product/:productId', async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId })
    .populate('user', 'name')
    .sort({ createdAt: -1 });
  res.json({ reviews });
});

router.post('/', protect, async (req, res) => {
  const { productId, rating, title, body } = req.body;
  if (!productId || !rating) throw new HttpError(400, 'Product and rating are required');
  const product = await Product.findById(productId);
  if (!product) throw new HttpError(404, 'Product not found');

  const review = await Review.findOneAndUpdate(
    { product: productId, user: req.user._id },
    { rating, title: title || '', body: body || '' },
    { new: true, upsert: true, runValidators: true }
  );

  const stats = await Review.aggregate([
    { $match: { product: product._id } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  product.ratingAverage = stats[0] ? Math.round(stats[0].avg * 10) / 10 : 0;
  product.ratingCount = stats[0]?.count || 0;
  await product.save();

  res.status(201).json({ review });
});

export default router;
