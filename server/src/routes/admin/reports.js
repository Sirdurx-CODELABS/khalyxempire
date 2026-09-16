import { Router } from 'express';
import { Order } from '../../models/Order.js';
import { Product } from '../../models/Product.js';
import { requirePermission } from '../../middleware/admin.js';
import { sendCsv } from '../../utils/csv.js';

const router = Router();
router.use(requirePermission('reports'));

const COUNTED = { status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } };

router.get('/sales', async (req, res) => {
  const { from, to, category, format = 'json' } = req.query;
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
        lineTotal: item.price * item.qty,
        orderTotal: order.total,
        coupon: order.couponCode || ''
      });
    }
  }

  const summary = rows.reduce(
    (acc, row) => {
      acc.revenue += Number(row.lineTotal) || 0;
      acc.units += Number(row.qty) || 0;
      acc.lines += 1;
      return acc;
    },
    { revenue: 0, units: 0, lines: 0, orders: new Set(rows.map((r) => r.orderNumber)).size }
  );

  if (format === 'csv' || format === 'excel') {
    return sendCsv(res, `khalyx-sales-${Date.now()}.csv`, rows);
  }

  res.json({ rows, summary: { revenue: summary.revenue, units: summary.units, lines: summary.lines, orders: summary.orders } });
});

export default router;
