import { Router } from 'express';
import { optionalAuth, guestIdFrom } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { getCartDoc } from '../services/cart.js';
import { createCheckout, publicOrder } from '../services/orders.js';
import { applyCoupon, totals } from '../services/pricing.js';
import { paymentOptions } from '../services/payment/index.js';

const router = Router();

router.use(optionalAuth);

router.get('/options', async (_req, res) => {
  res.json(paymentOptions());
});

router.post('/preview', async (req, res) => {
  const cart = await getCartDoc({ user: req.user, guestId: guestIdFrom(req) });
  const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  try {
    const { discount, coupon } = await applyCoupon(req.body.couponCode, subtotal);
    res.json({ ...totals({ subtotal, discount }), coupon: coupon?.code || '' });
  } catch (err) {
    res.json({ ...totals({ subtotal, discount: 0 }), coupon: '', error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { contact, address, paymentProvider, couponCode } = req.body;
  if (!contact?.email || !contact?.name || !contact?.phone) {
    throw new HttpError(400, 'Name, email and phone are required');
  }
  if (!address?.line1 || !address?.city || !address?.state) {
    throw new HttpError(400, 'A complete delivery address is required');
  }
  const cart = await getCartDoc({ user: req.user, guestId: guestIdFrom(req) });
  const { order, payment } = await createCheckout({
    cart,
    user: req.user,
    contact,
    address: { ...address, fullName: address.fullName || contact.name, phone: address.phone || contact.phone },
    paymentProvider,
    couponCode
  });
  res.status(201).json({ order: publicOrder(order), payment });
});

export default router;
