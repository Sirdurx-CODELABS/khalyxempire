import { Router } from 'express';
import { Order } from '../models/Order.js';
import { optionalAuth, protect } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { publicOrder } from '../services/orders.js';

const router = Router();

router.get('/mine', protect, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ orders: orders.map(publicOrder) });
});

router.get('/:orderNumber', optionalAuth, async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber });
  if (!order) throw new HttpError(404, 'Order not found');
  const email = String(req.query.email || '').toLowerCase();
  const isOwner = req.user && String(req.user._id) === String(order.user);
  const isGuest = email && email === String(order.guestEmail).toLowerCase();
  if (!isOwner && !isGuest && req.user?.role !== 'admin' && req.user?.role !== 'staff') {
    throw new HttpError(403, 'Provide the order email to view this confirmation');
  }
  res.json({ order: publicOrder(order) });
});

export default router;
