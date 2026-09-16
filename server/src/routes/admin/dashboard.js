import { Router } from 'express';
import { Order } from '../../models/Order.js';
import { Product } from '../../models/Product.js';
import { requirePermission } from '../../middleware/admin.js';

const router = Router();
const COUNTED = { status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } };

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n) {
  const x = startOfDay();
  x.setDate(x.getDate() - n);
  return x;
}

async function totalsSince(from) {
  const [agg] = await Order.aggregate([
    { $match: { ...COUNTED, paidAt: { $gte: from } } },
    { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
  ]);
  return { revenue: agg?.revenue || 0, orders: agg?.orders || 0 };
}

router.get('/', requirePermission('dashboard'), async (_req, res) => {
  const today = startOfDay();
  const week = daysAgo(7);
  const month = daysAgo(30);
  const chartFrom = daysAgo(13);

  const [salesToday, salesWeek, salesMonth, recentOrders, chart] = await Promise.all([
    totalsSince(today),
    totalsSince(week),
    totalsSince(month),
    Order.find(COUNTED).sort({ paidAt: -1, createdAt: -1 }).limit(8),
    Order.aggregate([
      { $match: { ...COUNTED, paidAt: { $gte: chartFrom } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  const chartMap = Object.fromEntries(chart.map((d) => [d._id, d]));
  const revenueChart = [];
  for (let i = 13; i >= 0; i -= 1) {
    const day = daysAgo(i);
    const key = day.toISOString().slice(0, 10);
    revenueChart.push({
      date: key,
      label: day.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }),
      revenue: chartMap[key]?.revenue || 0,
      orders: chartMap[key]?.orders || 0
    });
  }

  const products = await Product.find({ isActive: true }).select('name slug variants images');
  const lowStock = [];
  for (const product of products) {
    for (const variant of product.variants) {
      if (variant.stock <= (variant.lowStockThreshold ?? 5)) {
        lowStock.push({
          productId: product._id,
          name: product.name,
          slug: product.slug,
          image: product.images?.[0] || '',
          variantId: variant._id,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          stock: variant.stock,
          reserved: variant.reserved,
          threshold: variant.lowStockThreshold
        });
      }
    }
  }
  lowStock.sort((a, b) => a.stock - b.stock);

  res.json({
    salesToday,
    salesWeek,
    salesMonth,
    revenueChart,
    lowStock: lowStock.slice(0, 12),
    lowStockCount: lowStock.length,
    recentOrders
  });
});

export default router;
