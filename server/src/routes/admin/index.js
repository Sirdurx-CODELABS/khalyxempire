import { Router } from 'express';
import { requireStaff, requireApp } from '../../middleware/admin.js';
import { APPS } from '@khalyx/shared';
import dashboard from './dashboard.js';
import products from './products.js';
import orders from './orders.js';
import customers from './customers.js';
import inventory from './inventory.js';
import coupons from './coupons.js';
import staff from './staff.js';
import reports from './reports.js';
import labels from './labels.js';
import uploads from './uploads.js';

const router = Router();
router.use(...requireStaff, requireApp(APPS.ADMIN));
router.use('/dashboard', dashboard);
router.use('/products', products);
router.use('/orders', orders);
router.use('/customers', customers);
router.use('/inventory', inventory);
router.use('/coupons', coupons);
router.use('/staff', staff);
router.use('/reports', reports);
router.use('/labels', labels);
router.use('/uploads', uploads);

export default router;
