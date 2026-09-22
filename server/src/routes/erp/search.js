import { Router } from 'express';
import { Product } from '../../models/Product.js';
import { Supplier } from '../../models/Supplier.js';
import { PurchaseOrder } from '../../models/PurchaseOrder.js';
import { catalogFilter } from '../../services/catalogSearch.js';

const router = Router();

router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ results: [] });
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const [products, suppliers, pos] = await Promise.all([
    Product.find(catalogFilter(q, { activeOnly: true })).limit(6).select('name slug images'),
    Supplier.find({ $or: [{ name: rx }, { contactName: rx }, { phone: rx }] })
      .limit(5)
      .select('name status phone'),
    PurchaseOrder.find({ poNumber: rx }).limit(5).populate('supplier', 'name').select('poNumber status')
  ]);
  res.json({
    results: [
      ...products.map((p) => ({
        id: String(p._id),
        type: 'product',
        title: p.name,
        meta: 'Catalog',
        href: '/'
      })),
      ...suppliers.map((s) => ({
        id: String(s._id),
        type: 'supplier',
        title: s.name,
        meta: s.status,
        href: '/suppliers'
      })),
      ...pos.map((po) => ({
        id: String(po._id),
        type: 'purchase_order',
        title: po.poNumber,
        meta: `${po.status} · ${po.supplier?.name || ''}`,
        href: '/purchase-orders'
      }))
    ]
  });
});

export default router;
