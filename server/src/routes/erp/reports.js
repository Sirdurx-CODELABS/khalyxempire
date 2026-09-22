import { Router } from 'express';
import { Order } from '../../models/Order.js';
import { User } from '../../models/User.js';
import { Reconciliation } from '../../models/Reconciliation.js';

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
  const closes = await Reconciliation.find({ date: from.toISOString().slice(0, 10) }).populate('staff', 'name');
  res.json({ summary, closes });
});

router.post('/reconciliation', async (req, res) => {
  const from = req.body.date ? new Date(req.body.date) : new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setHours(23, 59, 59, 999);
  const orders = await Order.find({
    ...COUNTED,
    channel: 'pos',
    paidAt: { $gte: from, $lte: to }
  });
  const expected = { cash: 0, card: 0, transfer: 0, total: 0 };
  for (const order of orders) {
    const parts = order.payments?.length ? order.payments : [{ method: order.payment?.provider, amount: order.total }];
    for (const p of parts) {
      if (expected[p.method] != null) expected[p.method] += p.amount || 0;
      expected.total += p.amount || 0;
    }
  }
  const countedCash = Number(req.body.countedCash) || 0;
  const countedCard = Number(req.body.countedCard) || 0;
  const countedTransfer = Number(req.body.countedTransfer) || 0;
  const countedTotal = countedCash + countedCard + countedTransfer;
  const row = await Reconciliation.findOneAndUpdate(
    { date: from.toISOString().slice(0, 10), staff: req.user._id },
    {
      expectedCash: expected.cash,
      expectedCard: expected.card,
      expectedTransfer: expected.transfer,
      expectedTotal: expected.total,
      countedCash,
      countedCard,
      countedTransfer,
      countedTotal,
      discrepancy: countedTotal - expected.total,
      notes: req.body.notes || '',
      closedAt: new Date()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.status(201).json({ reconciliation: row, expected });
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
