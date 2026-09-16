import { Router } from 'express';
import { Wishlist } from '../models/Wishlist.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/', async (req, res) => {
  const list = await Wishlist.findOne({ user: req.user._id }).populate({
    path: 'products',
    populate: { path: 'category', select: 'name slug' }
  });
  res.json({ products: list?.products || [] });
});

router.post('/:productId', async (req, res) => {
  const list = await Wishlist.findOneAndUpdate(
    { user: req.user._id },
    { $addToSet: { products: req.params.productId } },
    { upsert: true, new: true }
  ).populate('products');
  res.json({ products: list.products });
});

router.delete('/:productId', async (req, res) => {
  const list = await Wishlist.findOneAndUpdate(
    { user: req.user._id },
    { $pull: { products: req.params.productId } },
    { new: true }
  ).populate('products');
  res.json({ products: list?.products || [] });
});

export default router;
