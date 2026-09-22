import { Router } from 'express';
import { ORDER_STATUSES, SHIPPING_CARRIERS } from '@khalyx/shared';
import { Order } from '../../models/Order.js';
import { HttpError } from '../../middleware/error.js';
import { publicOrder, setOrderStatus, packOrder, updateShipment } from '../../services/orders.js';

const router = Router();

router.get('/', async (req, res) => {
  const { status, q, page = 1, limit = 40, from, to, channel } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (channel) filter.channel = channel;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }
  if (q) {
    filter.$or = [
      { orderNumber: { $regex: q, $options: 'i' } },
      { guestName: { $regex: q, $options: 'i' } },
      { guestPhone: { $regex: q, $options: 'i' } },
      { 'shipping.trackingNumber': { $regex: q, $options: 'i' } }
    ];
  }
  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter).populate('soldBy', 'name').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Order.countDocuments(filter)
  ]);
  res.json({
    orders: orders.map(publicOrder),
    total,
    page: Number(page),
    statuses: ORDER_STATUSES,
    carriers: SHIPPING_CARRIERS
  });
});

router.get('/:orderNumber', async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber })
    .populate('soldBy', 'name')
    .populate('fulfillment.packedBy', 'name');
  if (!order) throw new HttpError(404, 'Order not found');
  res.json({ order: publicOrder(order), carriers: SHIPPING_CARRIERS });
});

router.patch('/:orderNumber', async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber });
  if (!order) throw new HttpError(404, 'Order not found');
  if (req.body.pack) {
    const updated = await packOrder(order, {
      notes: req.body.packingNotes,
      checkedSkus: req.body.checkedSkus,
      userId: req.user?._id
    });
    return res.json({ order: publicOrder(updated) });
  }
  if (req.body.shipment) {
    const updated = await updateShipment(order, req.body.shipment);
    return res.json({ order: publicOrder(updated) });
  }
  if (!ORDER_STATUSES.includes(req.body.status)) throw new HttpError(400, 'Invalid status');
  const updated = await setOrderStatus(order, req.body.status, {
    carrier: req.body.carrier,
    trackingNumber: req.body.trackingNumber,
    trackingUrl: req.body.trackingUrl
  });
  res.json({ order: publicOrder(updated) });
});

export default router;
