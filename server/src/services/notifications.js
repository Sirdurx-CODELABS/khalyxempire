import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Supplier } from '../models/Supplier.js';
import { SupplyRequest } from '../models/SupplyRequest.js';
import { requestTone, supplierAlerts } from './suppliers.js';

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function listAdminNotifications() {
  const today = startOfDay();
  const [alerts, requests, pendingSuppliers, recentOrders, products] = await Promise.all([
    supplierAlerts(),
    SupplyRequest.find({ status: { $in: ['pending', 'in_progress'] } })
      .populate('supplier', 'name')
      .populate('requestedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(20),
    Supplier.find({ status: 'pending' }).populate('submittedBy', 'name').sort({ createdAt: -1 }).limit(8),
    Order.find({ createdAt: { $gte: today } })
      .sort({ createdAt: -1 })
      .limit(8)
      .select('orderNumber status total createdAt guestName'),
    Product.find({ isActive: true }).select('name variants')
  ]);

  const lowStock = [];
  for (const product of products) {
    for (const variant of product.variants || []) {
      if (variant.stock <= (variant.lowStockThreshold ?? 5)) {
        lowStock.push({
          productId: product._id,
          name: product.name,
          sku: variant.sku,
          stock: variant.stock
        });
      }
    }
  }
  lowStock.sort((a, b) => a.stock - b.stock);

  const items = [
    ...requests.map((r) => ({
      id: String(r._id),
      type: 'supply_request',
      tone: requestTone(r),
      unread: r.status === 'pending' && !r.seenAt,
      title: r.seenAt ? `Supply request · ${r.supplier?.name || 'Supplier'}` : `New supply request · ${r.supplier?.name || 'Supplier'}`,
      body: `${r.requestedBy?.name || 'Staff'}: ${r.message}`,
      href: '/suppliers?tab=requests',
      at: r.createdAt
    })),
    ...pendingSuppliers.map((s) => ({
      id: String(s._id),
      type: 'supplier_pending',
      tone: 'warn',
      unread: false,
      title: `Pending supplier · ${s.name}`,
      body: `Submitted by ${s.submittedBy?.name || 'staff'}`,
      href: '/suppliers?tab=pending',
      at: s.createdAt
    })),
    ...lowStock.slice(0, 8).map((row) => ({
      id: `${row.productId}-${row.sku}`,
      type: 'low_stock',
      tone: 'warn',
      unread: false,
      title: `Low stock · ${row.name}`,
      body: `${row.sku} has ${row.stock} left`,
      href: '/inventory?status=low',
      at: new Date()
    })),
    ...recentOrders.map((o) => ({
      id: String(o._id),
      type: 'order',
      tone: 'info',
      unread: false,
      title: `Order ${o.orderNumber}`,
      body: `${o.guestName || 'Customer'} · ${o.status}`,
      href: `/orders/${o.orderNumber}`,
      at: o.createdAt
    }))
  ].sort((a, b) => new Date(b.at) - new Date(a.at));

  const unread = items.filter((i) => i.unread).length;
  return {
    ...alerts,
    lowStockCount: lowStock.length,
    ordersToday: recentOrders.length,
    unread,
    items: items.slice(0, 24)
  };
}
