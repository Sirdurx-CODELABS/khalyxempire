import { Router } from 'express';
import { Coupon } from '../../models/Coupon.js';
import { HttpError } from '../../middleware/error.js';
import { requirePermission } from '../../middleware/admin.js';

const router = Router();
router.use(requirePermission('coupons'));

router.get('/', async (_req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ coupons });
});

router.post('/', async (req, res) => {
  const { code, type, value, minSubtotal, maxUses, expiresAt, isActive } = req.body;
  if (!code || !type || value == null) throw new HttpError(400, 'Code, type and value are required');
  const coupon = await Coupon.create({
    code: String(code).toUpperCase(),
    type,
    value,
    minSubtotal: minSubtotal || 0,
    maxUses: maxUses || 0,
    expiresAt: expiresAt || undefined,
    isActive: isActive !== false
  });
  res.status(201).json({ coupon });
});

router.patch('/:id', async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw new HttpError(404, 'Coupon not found');
  const fields = ['code', 'type', 'value', 'minSubtotal', 'maxUses', 'expiresAt', 'isActive'];
  for (const key of fields) {
    if (req.body[key] !== undefined) coupon[key] = key === 'code' ? String(req.body[key]).toUpperCase() : req.body[key];
  }
  await coupon.save();
  res.json({ coupon });
});

router.delete('/:id', async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
