import { Router } from 'express';
import mongoose from 'mongoose';
import { ROLES } from '@khalyx/shared';
import { User } from '../../models/User.js';
import { lookupCatalog, posCatalog, completePosSale, holdSale, listHeldSales, resumeHeldSale } from '../../services/pos.js';
import { applyCoupon } from '../../services/pricing.js';
import { sendOrderEmail } from '../../services/email.js';
import { HttpError } from '../../middleware/error.js';
import { Order } from '../../models/Order.js';
import { publicOrder } from '../../services/orders.js';
import { getStoreSettings, publicPosSettings } from '../../services/settings.js';

const router = Router();

router.get('/lookup', async (req, res) => {
  const items = await lookupCatalog(req.query.q);
  res.json({ items });
});

router.get('/catalog', async (req, res) => {
  const data = await posCatalog({ q: req.query.q, category: req.query.category, limit: req.query.limit });
  res.json(data);
});

router.get('/customers', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ customers: [] });
  const or = [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }, { phone: { $regex: q, $options: 'i' } }];
  if (mongoose.isValidObjectId(q)) or.push({ _id: q });
  const users = await User.find({
    role: ROLES.CUSTOMER,
    isActive: true,
    $or: or
  })
    .limit(12)
    .select('name email phone accountBalance');
  res.json({
    customers: users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      accountBalance: u.accountBalance || 0
    }))
  });
});

router.get('/settings', async (_req, res) => {
  res.json(publicPosSettings(await getStoreSettings()));
});

router.post('/coupon', async (req, res) => {
  const { discount, coupon } = await applyCoupon(req.body.code, Number(req.body.subtotal) || 0, req.body.items || []);
  res.json({ valid: true, code: coupon.code, type: coupon.type, value: coupon.value, discount });
});

router.post('/sale', async (req, res) => {
  const order = await completePosSale({
    staff: req.user,
    items: req.body.items,
    discount: req.body.discount,
    manualDiscount: req.body.manualDiscount,
    couponCode: req.body.couponCode,
    paymentMethod: req.body.paymentMethod,
    payments: req.body.payments,
    tendered: req.body.tendered,
    customerName: req.body.customerName,
    customerPhone: req.body.customerPhone,
    customerEmail: req.body.customerEmail,
    customerId: req.body.customerId,
    note: req.body.note,
    emailReceipt: req.body.emailReceipt
  });
  res.status(201).json({ order });
});

router.post('/sales/:orderNumber/email', async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber, channel: 'pos' });
  if (!order) throw new HttpError(404, 'Sale not found');
  if (req.body.email) order.guestEmail = req.body.email;
  await order.save();
  await sendOrderEmail(order);
  res.json({ ok: true });
});

router.get('/held', async (req, res) => {
  const held = await listHeldSales(req.user);
  res.json({ held });
});

router.post('/held', async (req, res) => {
  const held = await holdSale(req.user, req.body);
  res.status(201).json({ held });
});

router.post('/held/:id/resume', async (req, res) => {
  const held = await resumeHeldSale(req.user, req.params.id);
  res.json({ held });
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
