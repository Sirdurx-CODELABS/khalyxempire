import { Router } from 'express';
import { applyCoupon, totalsWithSettings } from '../services/pricing.js';
import { getCartDoc } from '../services/cart.js';
import { optionalAuth, guestIdFrom } from '../middleware/auth.js';

const router = Router();

router.post('/validate', optionalAuth, async (req, res) => {
  const cart = await getCartDoc({ user: req.user, guestId: guestIdFrom(req) });
  const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const { discount, coupon } = await applyCoupon(req.body.code, subtotal);
  res.json({
    valid: true,
    code: coupon.code,
    discount,
    ...(await totalsWithSettings({ subtotal, discount }))
  });
});

export default router;
