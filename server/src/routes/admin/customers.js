import { Router } from 'express';
import { ROLES } from '@khalyx/shared';
import { User } from '../../models/User.js';
import { Order } from '../../models/Order.js';
import { HttpError } from '../../middleware/error.js';
import { requirePermission, publicUser } from '../../middleware/admin.js';
import { publicOrder } from '../../services/orders.js';
import { sendCsv } from '../../utils/csv.js';
import { createManagedAccount } from '../../services/accounts.js';

const router = Router();
router.use(requirePermission('customers'));

router.get('/', async (req, res) => {
  const { q, page = 1, limit = 25 } = req.query;
  const filter = { role: ROLES.CUSTOMER };
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } }
    ];
  }
  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    User.countDocuments(filter)
  ]);

  const ids = users.map((u) => u._id);
  const spent = await Order.aggregate([
    { $match: { user: { $in: ids }, status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } } },
    { $group: { _id: '$user', total: { $sum: '$total' }, orders: { $sum: 1 } } }
  ]);
  const map = Object.fromEntries(spent.map((s) => [String(s._id), s]));

  res.json({
    customers: users.map((u) => ({
      ...publicUser(u),
      orderCount: map[String(u._id)]?.orders || 0,
      lifetimeValue: map[String(u._id)]?.total || 0
    })),
    total,
    page: Number(page)
  });
});

router.get('/export/csv', async (_req, res) => {
  const users = await User.find({ role: ROLES.CUSTOMER }).sort({ createdAt: -1 });
  sendCsv(
    res,
    `khalyx-customers-${Date.now()}.csv`,
    users.map((u) => ({
      name: u.name,
      email: u.email,
      phone: u.phone,
      tags: (u.tags || []).join('|'),
      notes: u.notes || ''
    }))
  );
});

router.post('/', async (req, res) => {
  const user = await createManagedAccount({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    phone: req.body.phone,
    accountType: 'storefront'
  });
  res.status(201).json({ customer: user });
});

router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.role !== ROLES.CUSTOMER) throw new HttpError(404, 'Customer not found');
  const orders = await Order.find({
    $or: [{ user: user._id }, { guestEmail: user.email }, { guestPhone: user.phone }]
  }).sort({ createdAt: -1 });
  res.json({ customer: publicUser(user), orders: orders.map(publicOrder) });
});

router.patch('/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.role !== ROLES.CUSTOMER) throw new HttpError(404, 'Customer not found');
  if (req.body.name) user.name = req.body.name;
  if (req.body.phone !== undefined) user.phone = req.body.phone;
  if (req.body.isActive !== undefined) user.isActive = req.body.isActive;
  if (req.body.notes !== undefined) user.notes = req.body.notes;
  if (req.body.tags !== undefined) {
    user.tags = Array.isArray(req.body.tags)
      ? req.body.tags
      : String(req.body.tags)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
  }
  if (req.body.password) user.password = req.body.password;
  await user.save();
  res.json({ customer: publicUser(user) });
});

export default router;
