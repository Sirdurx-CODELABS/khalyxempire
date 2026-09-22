import { Router } from 'express';
import { listAdminNotifications } from '../../services/notifications.js';
import { markSupplyRequestsSeen } from '../../services/suppliers.js';

const router = Router();

router.get('/', async (_req, res) => {
  res.json(await listAdminNotifications());
});

router.post('/read', async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  const alerts = await markSupplyRequestsSeen(req.user, ids);
  const data = await listAdminNotifications();
  res.json({ ...data, ...alerts });
});

export default router;
