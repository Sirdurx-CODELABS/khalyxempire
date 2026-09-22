import { Router } from 'express';
import { Order } from '../../models/Order.js';
import { Product } from '../../models/Product.js';
import { User } from '../../models/User.js';
import { ClockEntry } from '../../models/ClockEntry.js';
import { Reconciliation } from '../../models/Reconciliation.js';
import { requirePermission } from '../../middleware/admin.js';
import { sendCsv } from '../../utils/csv.js';

const router = Router();
router.use(requirePermission('reports'));

const COUNTED = { status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } };

function dateMatch(from, to) {
  const match = { ...COUNTED };
  if (from || to) {
    match.paidAt = {};
    if (from) match.paidAt.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      match.paidAt.$lte = end;
    }
  }
  return match;
}

router.get('/sales', async (req, res) => {
  const { from, to, category, channel, format = 'json' } = req.query;
  const match = dateMatch(from, to);
  if (channel) match.channel = channel;

  const orders = await Order.find(match).sort({ paidAt: -1 });
  let categoryIds = null;
  if (category) {
    const products = await Product.find({ category }).select('_id');
    categoryIds = new Set(products.map((p) => String(p._id)));
  }

  const rows = [];
  for (const order of orders) {
    for (const item of order.items) {
      if (categoryIds && !categoryIds.has(String(item.product))) continue;
      const lineTotal = item.price * item.qty;
      const cost = (item.costPrice || 0) * item.qty;
      rows.push({
        date: order.paidAt ? order.paidAt.toISOString().slice(0, 10) : '',
        orderNumber: order.orderNumber,
        channel: order.channel,
        status: order.status,
        sku: item.sku,
        name: item.name,
        size: item.size,
        color: item.color,
        qty: item.qty,
        unitPrice: item.price,
        costPrice: item.costPrice || 0,
        lineTotal,
        profit: lineTotal - cost,
        orderTotal: order.total,
        coupon: order.couponCode || '',
        staff: order.soldBy || ''
      });
    }
  }

  const summary = rows.reduce(
    (acc, row) => {
      acc.revenue += Number(row.lineTotal) || 0;
      acc.cost += (Number(row.costPrice) || 0) * (Number(row.qty) || 0);
      acc.units += Number(row.qty) || 0;
      acc.lines += 1;
      return acc;
    },
    { revenue: 0, cost: 0, units: 0, lines: 0, orders: new Set(rows.map((r) => r.orderNumber)).size }
  );
  summary.profit = summary.revenue - summary.cost;

  if (format === 'csv' || format === 'excel') {
    return sendCsv(res, `khalyx-sales-${Date.now()}.csv`, rows);
  }

  res.json({
    rows,
    summary: {
      revenue: summary.revenue,
      cost: summary.cost,
      profit: summary.profit,
      units: summary.units,
      lines: summary.lines,
      orders: summary.orders
    }
  });
});

router.get('/bestsellers', async (req, res) => {
  const match = dateMatch(req.query.from, req.query.to);
  if (req.query.channel) match.channel = req.query.channel;
  const rows = await Order.aggregate([
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: { sku: '$items.sku', name: '$items.name' },
        units: { $sum: '$items.qty' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } }
      }
    },
    { $sort: { units: -1 } },
    { $limit: 20 }
  ]);
  res.json({ rows });
});

router.get('/staff', async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 864e5);
  const to = req.query.to ? new Date(req.query.to) : new Date();
  to.setHours(23, 59, 59, 999);
  const sales = await Order.aggregate([
    { $match: { channel: 'pos', ...COUNTED, paidAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$soldBy', revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
  ]);
  const clocks = await ClockEntry.find({ clockIn: { $gte: from, $lte: to } });
  const hoursMap = {};
  for (const entry of clocks) {
    const end = entry.clockOut ? new Date(entry.clockOut) : new Date();
    let ms = end - new Date(entry.clockIn);
    for (const br of entry.breaks || []) {
      const bEnd = br.end ? new Date(br.end) : new Date();
      ms -= Math.max(0, bEnd - new Date(br.start));
    }
    const key = String(entry.user);
    hoursMap[key] = (hoursMap[key] || 0) + ms / 36e5;
  }
  const users = await User.find({ _id: { $in: sales.map((r) => r._id).filter(Boolean) } }).select('name email staffTitle');
  const map = Object.fromEntries(users.map((u) => [String(u._id), u]));
  res.json({
    rows: sales.map((r) => ({
      staffId: r._id,
      name: map[String(r._id)]?.name || 'Unassigned',
      title: map[String(r._id)]?.staffTitle || 'sales',
      revenue: r.revenue,
      orders: r.orders,
      hours: Math.round((hoursMap[String(r._id)] || 0) * 100) / 100
    }))
  });
});

router.get('/valuation', async (_req, res) => {
  const products = await Product.find().populate('category', 'name');
  const rows = [];
  let retail = 0;
  let cost = 0;
  for (const p of products) {
    for (const v of p.variants) {
      const stockCost = (v.costPrice || 0) * v.stock;
      const stockRetail = (v.price || 0) * v.stock;
      cost += stockCost;
      retail += stockRetail;
      rows.push({
        name: p.name,
        category: p.category?.name,
        sku: v.sku,
        stock: v.stock,
        costPrice: v.costPrice || 0,
        price: v.price,
        costValue: stockCost,
        retailValue: stockRetail
      });
    }
  }
  res.json({ rows, summary: { cost, retail, margin: retail - cost } });
});

router.get('/reconciliation', async (req, res) => {
  const filter = {};
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = req.query.from;
    if (req.query.to) filter.date.$lte = req.query.to;
  }
  const rows = await Reconciliation.find(filter).populate('staff', 'name email').sort({ date: -1, closedAt: -1 }).limit(60);
  res.json({ rows });
});

export default router;
