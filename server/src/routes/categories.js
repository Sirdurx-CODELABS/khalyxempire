import { Router } from 'express';
import { Category } from '../models/Category.js';

const router = Router();

router.get('/', async (_req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 });
  res.json({ categories });
});

router.get('/:slug', async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug });
  if (!category) return res.status(404).json({ message: 'Category not found' });
  res.json({ category });
});

export default router;
