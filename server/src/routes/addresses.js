import { Router } from 'express';
import { Address } from '../models/Address.js';
import { protect } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const router = Router();
router.use(protect);

router.get('/', async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
  res.json({ addresses });
});

router.post('/', async (req, res) => {
  const payload = { ...req.body, user: req.user._id };
  if (payload.isDefault) {
    await Address.updateMany({ user: req.user._id }, { isDefault: false });
  }
  const address = await Address.create(payload);
  res.status(201).json({ address });
});

router.patch('/:id', async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
  if (!address) throw new HttpError(404, 'Address not found');
  if (req.body.isDefault) {
    await Address.updateMany({ user: req.user._id }, { isDefault: false });
  }
  Object.assign(address, req.body);
  await address.save();
  res.json({ address });
});

router.delete('/:id', async (req, res) => {
  await Address.deleteOne({ _id: req.params.id, user: req.user._id });
  res.json({ ok: true });
});

export default router;
