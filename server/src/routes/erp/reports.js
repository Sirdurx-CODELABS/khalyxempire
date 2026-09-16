import { Router } from 'express';
import { Order } from '../../models/Order.js';
import { User } from '../../models/User.js';

const router = Router();
const COUNTED = { status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } };

router.get('/reconciliation', async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : new Date(new Date().setHours(0, 0, 0, 0));
  const to = req.query.to ? new Date(req.query.to) : new Date();
  to.setHours(23, 59, 59, 999);

  const match = { ...COUNTED, paidAt: { $gte: from, $lte: to } };
  const orders = await Order.find(match).populate('soldBy', 'name');

  const summary = {
    from,
    to,
    pos: { orders: 0, revenue: 0, units: 0, byMethod: { cash: 0, card: 0, transfer: 0 }, byStaff: {} },
    online: { orders: 0, revenue: 0, units: 0 },
    combined: { orders: 0, revenue: 0, units: 0 }
  };

  for (const order of orders) {
    const units = order.items.reduce((s, i) => s + i.qty, 0);
    summary.combined.orders += 1;
    summary.combined.revenue += order.total;
    summary.combined.units += units;
    if (order.channel === 'pos') {
      summary.pos.orders += 1;
      summary.pos.revenue += order.total;
      summary.pos.units += units;
      const method = order.payment?.provider;
      if (summary.pos.byMethod[method] != null) summary.pos.byMethod[method] += order.total;
      const staffName = order.soldBy?.name || 'Unassigned';
      summary.pos.byStaff[staffName] = (summary.pos.byStaff[staffName] || 0) + order.total;
    } else {
      summary.online.orders += 1;
      summary.online.revenue += order.total;
      summary.online.units += units;
    }
  }

  summary.pos.byStaff = Object.entries(summary.pos.byStaff).map(([name, revenue]) => ({ name, revenue }));
  res.json({ summary });
});

router.get('/staff-sales', async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await Order.aggregate([
    { $match: { channel: 'pos', status: 'paid', paidAt: { $gte: from } } },
    { $group: { _id: '$soldBy', revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
  ]);
  const users = await User.find({ _id: { $in: rows.map((r) => r._id).filter(Boolean) } }).select('name email');
  const map = Object.fromEntries(users.map((u) => [String(u._id), u]));
  res.json({
    rows: rows.map((r) => ({
      staffId: r._id,
      name: map[String(r._id)]?.name || 'Unassigned',
      email: map[String(r._id)]?.email || '',
      revenue: r.revenue,
      orders: r.orders
    }))
  });
});

export default router;
