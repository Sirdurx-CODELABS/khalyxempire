import { Router } from 'express';
import { requirePermission } from '../../middleware/admin.js';
import { getDashboard } from '../../services/dashboard.js';

const router = Router();

router.get('/', requirePermission('dashboard'), async (_req, res) => {
  res.json(await getDashboard());
});

export default router;
