import { Router } from 'express';
import { requireStaff, requireApp } from '../../middleware/admin.js';
import { APPS } from '@khalyx/shared';
import pos from './pos.js';
import suppliers from './suppliers.js';
import purchaseOrders from './purchaseOrders.js';
import clock from './clock.js';
import reports from './reports.js';
import labels from './labels.js';
import sync from './sync.js';
import search from './search.js';

const router = Router();
router.use(...requireStaff, requireApp(APPS.ERP));
router.use('/pos', pos);
router.use('/suppliers', suppliers);
router.use('/purchase-orders', purchaseOrders);
router.use('/clock', clock);
router.use('/reports', reports);
router.use('/labels', labels);
router.use('/sync', sync);
router.use('/search', search);

export default router;
