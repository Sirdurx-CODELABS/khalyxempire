import { Router } from 'express';
import { ROLES } from '@khalyx/shared';
import { Product } from '../../models/Product.js';
import { Order } from '../../models/Order.js';
import { User } from '../../models/User.js';
import { catalogFilter } from '../../services/catalogSearch.js';

function can(user, perm) {
  return user?.role === 'admin' || user?.permissions?.includes(perm);
}

const router = Router();

router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ results: [] });
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const jobs = [];
  if (can(req.user, 'products')) {
    jobs.push(
      Product.find(catalogFilter(q, { activeOnly: false }))
        .populate('category', 'name')
        .limit(6)
        .select('name slug images status category')
        .then((rows) =>
          rows.map((p) => ({
            id: String(p._id),
            type: 'product',
            title: p.name,
            meta: p.category?.name || p.status,
            href: `/products/${p._id}`
          }))
        )
    );
  }
  if (can(req.user, 'orders')) {
    jobs.push(
      Order.find({
        $or: [{ orderNumber: rx }, { guestEmail: rx }, { guestName: rx }, { guestPhone: rx }]
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('orderNumber status total guestName')
        .then((rows) =>
          rows.map((o) => ({
            id: String(o._id),
            type: 'order',
            title: o.orderNumber,
            meta: `${o.status} · ${o.guestName || ''}`.trim(),
            href: `/orders/${o.orderNumber}`
          }))
        )
    );
  }
  if (can(req.user, 'customers')) {
    jobs.push(
      User.find({
        role: ROLES.CUSTOMER,
        $or: [{ name: rx }, { email: rx }, { phone: rx }]
      })
        .limit(5)
        .select('name email phone')
        .then((rows) =>
          rows.map((c) => ({
            id: String(c._id),
            type: 'customer',
            title: c.name,
            meta: c.phone || c.email,
            href: `/customers/${c._id}`
          }))
        )
    );
  }
  const groups = await Promise.all(jobs);
  res.json({ results: groups.flat() });
});

export default router;
