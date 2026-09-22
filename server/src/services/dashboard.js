import { ROLES } from '@khalyx/shared';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { ClockEntry } from '../models/ClockEntry.js';
import { InventoryMovement } from '../models/InventoryMovement.js';
import { Supplier } from '../models/Supplier.js';
import { SupplyRequest } from '../models/SupplyRequest.js';
import { Coupon } from '../models/Coupon.js';
import { User } from '../models/User.js';
import { supplierAlerts } from './suppliers.js';
import { inventoryStats } from './inventoryAdmin.js';

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

function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const day = x.getDay();
  x.setDate(x.getDate() - ((day + 6) % 7));
  return x;
}

function startOfMonth(d = new Date()) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

function pctChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

async function totalsSince(from, extra = {}, until) {
  const match = { ...COUNTED, paidAt: until ? { $gte: from, $lt: until } : { $gte: from }, ...extra };
  const [agg] = await Order.aggregate([
    { $match: match },
    { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
  ]);
  return { revenue: agg?.revenue || 0, orders: agg?.orders || 0 };
}

function fillDaily(rows, days) {
  const map = {};
  for (const row of rows) {
    const key = `${row._id.date}:${row._id.channel}`;
    map[key] = row;
  }
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = daysAgo(i);
    const date = day.toISOString().slice(0, 10);
    const online = map[`${date}:online`]?.revenue || 0;
    const pos = map[`${date}:pos`]?.revenue || 0;
    out.push({
      date,
      label: day.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }),
      online,
      pos,
      revenue: online + pos
    });
  }
  return out;
}

function fillWeekly(rows) {
  const map = {};
  for (const row of rows) {
    const key = `${row._id.date}:${row._id.channel}`;
    map[key] = row;
  }
  const out = [];
  const thisWeek = startOfWeek();
  for (let i = 7; i >= 0; i -= 1) {
    const weekStart = new Date(thisWeek);
    weekStart.setDate(thisWeek.getDate() - i * 7);
    let online = 0;
    let pos = 0;
    for (let d = 0; d < 7; d += 1) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      const date = day.toISOString().slice(0, 10);
      online += map[`${date}:online`]?.revenue || 0;
      pos += map[`${date}:pos`]?.revenue || 0;
    }
    out.push({
      date: weekStart.toISOString().slice(0, 10),
      label: `W/c ${weekStart.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}`,
      online,
      pos,
      revenue: online + pos
    });
  }
  return out;
}

function fillMonthly(rows) {
  const map = {};
  for (const row of rows) {
    const month = String(row._id.date || '').slice(0, 7);
    const key = `${month}:${row._id.channel}`;
    map[key] = (map[key] || 0) + (row.revenue || 0);
  }
  const out = [];
  const cursor = startOfMonth();
  for (let i = 5; i >= 0; i -= 1) {
    const month = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    const online = map[`${key}:online`] || 0;
    const pos = map[`${key}:pos`] || 0;
    out.push({
      date: key,
      label: month.toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }),
      online,
      pos,
      revenue: online + pos
    });
  }
  return out;
}

function orderCustomer(order) {
  return order.user?.name || order.guestName || order.shippingAddress?.fullName || 'Guest';
}

function orderItemsLabel(items = []) {
  if (!items.length) return '—';
  const first = items[0].name || 'Item';
  const extra = items.length - 1;
  return extra ? `${first} +${extra}` : `${first} ×${items[0].qty || 1}`;
}

function couponAlerts(coupons) {
  const now = Date.now();
  const soon = now + 7 * 24 * 60 * 60 * 1000;
  return coupons
    .filter((c) => {
      const expiring = c.expiresAt && new Date(c.expiresAt).getTime() <= soon;
      const nearLimit = c.maxUses > 0 && c.usedCount / c.maxUses >= 0.8;
      return expiring || nearLimit;
    })
    .map((c) => {
      const expired = c.expiresAt && new Date(c.expiresAt).getTime() <= now;
      const expiring = c.expiresAt && new Date(c.expiresAt).getTime() <= soon;
      return {
        id: c._id,
        code: c.code,
        expiresAt: c.expiresAt,
        usedCount: c.usedCount,
        maxUses: c.maxUses,
        kind: expired ? 'expired' : expiring ? 'expiry' : 'usage'
      };
    });
}

export async function getDashboard() {
  const today = startOfDay();
  const yesterday = daysAgo(1);
  const week = daysAgo(7);
  const month = daysAgo(30);
  const chartFrom = daysAgo(13);
  const monthlyFrom = startOfMonth(new Date(today.getFullYear(), today.getMonth() - 5, 1));

  const [
    salesToday,
    salesYesterday,
    salesWeek,
    salesMonth,
    posToday,
    onlineToday,
    recentOrderDocs,
    chartRows,
    topAgg,
    clockIns,
    stockIn,
    alerts,
    pendingSuppliers,
    pendingRequests,
    newCustomers,
    coupons,
    products
  ] = await Promise.all([
    totalsSince(today),
    totalsSince(yesterday, {}, today),
    totalsSince(week),
    totalsSince(month),
    totalsSince(today, { channel: 'pos' }),
    totalsSince(today, { channel: 'online' }),
    Order.find(COUNTED)
      .populate('user', 'name')
      .populate('soldBy', 'name')
      .sort({ paidAt: -1, createdAt: -1 })
      .limit(10)
      .select('orderNumber guestName user items total status channel paidAt createdAt soldBy'),
    Order.aggregate([
      { $match: { ...COUNTED, paidAt: { $gte: monthlyFrom } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
            channel: '$channel'
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      }
    ]),
    Order.aggregate([
      { $match: { ...COUNTED, paidAt: { $gte: week } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          image: { $first: '$items.image' },
          units: { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } }
        }
      },
      { $sort: { units: -1 } },
      { $limit: 6 }
    ]),
    ClockEntry.find({ clockIn: { $gte: today } }).populate('user', 'name').sort({ clockIn: -1 }).limit(8),
    InventoryMovement.find({ type: 'receive', createdAt: { $gte: week } })
      .populate('product', 'name')
      .sort({ createdAt: -1 })
      .limit(8),
    supplierAlerts(),
    Supplier.find({ status: 'pending' })
      .populate('submittedBy', 'name email role staffTitle')
      .sort({ createdAt: -1 })
      .limit(6),
    SupplyRequest.find({ status: 'pending' })
      .populate('supplier', 'name category')
      .populate('requestedBy', 'name email role staffTitle')
      .sort({ createdAt: -1 })
      .limit(8),
    User.find({ role: ROLES.CUSTOMER, createdAt: { $gte: week } }).sort({ createdAt: -1 }).limit(8).select('name email createdAt'),
    Coupon.find({ isActive: true }).select('code type value expiresAt maxUses usedCount'),
    Product.find().select('name slug images variants category')
  ]);

  const productMap = Object.fromEntries(products.map((p) => [String(p._id), p]));
  const topProducts = topAgg.map((row) => {
    const product = productMap[String(row._id)];
    return {
      _id: row._id,
      name: product?.name || row.name,
      image: product?.images?.[0] || row.image || '',
      units: row.units,
      revenue: row.revenue
    };
  });

  const recentOrders = recentOrderDocs.map((o) => ({
    _id: o._id,
    orderNumber: o.orderNumber,
    customer: orderCustomer(o),
    items: orderItemsLabel(o.items),
    itemCount: (o.items || []).reduce((sum, i) => sum + (Number(i.qty) || 0), 0),
    total: o.total,
    status: o.status,
    channel: o.channel,
    paidAt: o.paidAt || o.createdAt
  }));

  const inventory = inventoryStats(products);
  const couponAlertList = couponAlerts(coupons);

  const activity = [
    ...stockIn.map((m) => ({
      type: 'stock',
      at: m.createdAt,
      href: m.product?._id ? `/inventory/${m.product._id}` : '/inventory',
      text: `Stock received · ${m.product?.name || m.sku} · +${m.qty}`
    })),
    ...pendingRequests.map((r) => ({
      type: 'supply',
      pending: r.status === 'pending',
      unread: !r.seenAt,
      at: r.createdAt,
      href: '/suppliers?tab=requests',
      text: `Supply request · ${r.supplier?.name || 'Supplier'} · ${r.requestedBy?.name || 'Staff'}`
    })),
    ...clockIns.map((c) => ({
      type: 'clock',
      at: c.clockIn,
      href: '/staff',
      text: `${c.user?.name || 'Staff'} clocked in`
    })),
    ...newCustomers.map((u) => ({
      type: 'customer',
      at: u.createdAt,
      href: `/customers/${u._id}`,
      text: `New customer · ${u.name}`
    }))
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 14);

  const alertsList = [
    ...inventory.lowItems.slice(0, 6).map((row) => ({
      type: 'low_stock',
      tone: row.totalStock <= 0 ? 'danger' : 'warn',
      title: `Low stock · ${row.name}`,
      body: `${row.totalStock} units left`,
      href: `/inventory/${row._id}`
    })),
    ...pendingRequests.map((r) => ({
      type: 'supply',
      tone: 'danger',
      title: `Supply request · ${r.supplier?.name || 'Supplier'}`,
      body: r.message || `${r.requestedBy?.name || 'Staff'} is waiting for Admin`,
      href: '/suppliers?tab=requests'
    })),
    ...couponAlertList.map((c) => ({
      type: 'coupon',
      tone: c.kind === 'expired' ? 'danger' : 'warn',
      title: `Coupon ${c.code}`,
      body:
        c.kind === 'usage'
          ? `${c.usedCount}/${c.maxUses} uses`
          : c.kind === 'expired'
            ? 'Expired'
            : `Expires ${new Date(c.expiresAt).toLocaleDateString('en-NG')}`,
      href: '/coupons'
    }))
  ];

  return {
    salesToday: {
      ...salesToday,
      changePct: pctChange(salesToday.revenue, salesYesterday.revenue),
      yesterday: salesYesterday
    },
    salesWeek,
    salesMonth,
    ordersToday: {
      total: (posToday.orders || 0) + (onlineToday.orders || 0),
      online: onlineToday.orders || 0,
      pos: posToday.orders || 0,
      onlineRevenue: onlineToday.revenue || 0,
      posRevenue: posToday.revenue || 0
    },
    channelToday: { pos: posToday, online: onlineToday },
    charts: {
      daily: fillDaily(chartRows, 14),
      weekly: fillWeekly(chartRows),
      monthly: fillMonthly(chartRows)
    },
    revenueChart: fillDaily(chartRows.filter((row) => row._id.date >= chartFrom.toISOString().slice(0, 10)), 14),
    inventory,
    topProducts,
    recentOrders,
    activity,
    alerts: alertsList,
    couponAlerts: couponAlertList,
    supplierAlerts: alerts,
    pendingSuppliers,
    pendingRequests,
    newCustomers
  };
}
