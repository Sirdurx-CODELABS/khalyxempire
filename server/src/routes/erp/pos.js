import { Router } from 'express';
import { lookupCatalog, completePosSale } from '../../services/pos.js';
import { HttpError } from '../../middleware/error.js';
import { Order } from '../../models/Order.js';
import { publicOrder } from '../../services/orders.js';

const router = Router();

router.get('/lookup', async (req, res) => {
  const items = await lookupCatalog(req.query.q);
  res.json({ items });
});

router.post('/sale', async (req, res) => {
  const order = await completePosSale({
    staff: req.user,
    items: req.body.items,
    discount: req.body.discount,
    paymentMethod: req.body.paymentMethod,
    tendered: req.body.tendered,
    customerName: req.body.customerName,
    customerPhone: req.body.customerPhone,
    note: req.body.note
  });
  res.status(201).json({ order });
});

router.get('/sales', async (req, res) => {
  const { from, to, staff } = req.query;
  const filter = { channel: 'pos' };
  if (staff) filter.soldBy = staff;
  if (from || to) {
    filter.paidAt = {};
    if (from) filter.paidAt.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.paidAt.$lte = end;
    }
  }
  const orders = await Order.find(filter).populate('soldBy', 'name email').sort({ paidAt: -1 }).limit(100);
  res.json({ orders: orders.map(publicOrder) });
});

router.get('/sales/:orderNumber', async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber, channel: 'pos' }).populate(
    'soldBy',
    'name email'
  );
  if (!order) throw new HttpError(404, 'Sale not found');
  res.json({ order: publicOrder(order) });
});

export default router;
