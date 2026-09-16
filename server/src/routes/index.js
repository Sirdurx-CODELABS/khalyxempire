import { Router } from 'express';
import authRoutes from './auth.js';
import categoryRoutes from './categories.js';
import productRoutes from './products.js';
import cartRoutes from './cart.js';
import checkoutRoutes from './checkout.js';
import orderRoutes from './orders.js';
import paymentRoutes from './payments.js';
import reviewRoutes from './reviews.js';
import wishlistRoutes from './wishlist.js';
import subscriberRoutes from './subscribers.js';
import couponRoutes from './coupons.js';
import addressRoutes from './addresses.js';
import adminRoutes from './admin/index.js';
import erpRoutes from './erp/index.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'khalyx-empire-api' });
});

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/reviews', reviewRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/subscribers', subscriberRoutes);
router.use('/coupons', couponRoutes);
router.use('/addresses', addressRoutes);
router.use('/admin', adminRoutes);
router.use('/erp', erpRoutes);

export default router;
