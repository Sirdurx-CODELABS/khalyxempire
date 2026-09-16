import { Router } from 'express';
import { ORDER_STATUSES } from '@khalyx/shared';
import { Order } from '../../models/Order.js';
import { HttpError } from '../../middleware/error.js';
import { requirePermission } from '../../middleware/admin.js';
import { publicOrder, setOrderStatus } from '../../services/orders.js';
import { sendCsv } from '../../utils/csv.js';

const router = Router();
router.use(requirePermission('orders'));

router.get('/', async (req, res) => {
  const { status, q, page = 1, limit = 25, from, to } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  if (q) {
    filter.$or = [
      { orderNumber: { $regex: q, $options: 'i' } },
      { guestEmail: { $regex: q, $options: 'i' } },
      { guestName: { $regex: q, $options: 'i' } },
      { guestPhone: { $regex: q, $options: 'i' } }
    ];
  }
  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Order.countDocuments(filter)
  ]);
  res.json({ orders: orders.map(publicOrder), total, page: Number(page), statuses: ORDER_STATUSES });
});

router.get('/:orderNumber', async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber }).populate('user', 'name email phone');
  if (!order) throw new HttpError(404, 'Order not found');
  res.json({ order: publicOrder(order) });
});

router.patch('/:orderNumber', async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber });
  if (!order) throw new HttpError(404, 'Order not found');
  if (!ORDER_STATUSES.includes(req.body.status)) throw new HttpError(400, 'Invalid status');
  const updated = await setOrderStatus(order, req.body.status);
  res.json({ order: publicOrder(updated) });
});

router.get('/:orderNumber/export', async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber });
  if (!order) throw new HttpError(404, 'Order not found');
  sendCsv(
    res,
    `${order.orderNumber}.csv`,
    order.items.map((i) => ({
      order: order.orderNumber,
      sku: i.sku,
      name: i.name,
      size: i.size,
      color: i.color,
      qty: i.qty,
      price: i.price,
      lineTotal: i.price * i.qty
    }))
  );
});

export default router;
