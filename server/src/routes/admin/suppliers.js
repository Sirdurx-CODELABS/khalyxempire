import { Router } from 'express';
import { requirePermission } from '../../middleware/admin.js';
import { HttpError } from '../../middleware/error.js';
import {
  createSupplier,
  createSupplyRequest,
  getSupplier,
  listSuppliers,
  listSupplyRequests,
  markSupplyRequestsSeen,
  supplierAlerts,
  updateSupplier,
  updateSupplyRequest
} from '../../services/suppliers.js';

const router = Router();

router.get('/alerts', async (_req, res) => {
  res.json(await supplierAlerts());
});

router.post('/requests/seen', requirePermission('inventory'), async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  res.json(await markSupplyRequestsSeen(req.user, ids));
});

router.get('/requests', requirePermission('inventory'), async (req, res) => {
  const requests = await listSupplyRequests({ status: req.query.status, supplier: req.query.supplier });
  res.json({ requests });
});

router.patch('/requests/:id', requirePermission('inventory'), async (req, res) => {
  const request = await updateSupplyRequest(req.params.id, { status: req.body.status }, req.user);
  res.json({ request });
});

router.get('/', requirePermission('inventory'), async (req, res) => {
  const suppliers = await listSuppliers({ status: req.query.status, q: req.query.q });
  const alerts = await supplierAlerts();
  res.json({ suppliers, ...alerts });
});

router.post('/', requirePermission('inventory'), async (req, res) => {
  const supplier = await createSupplier(req.body, req.user, 'admin');
  res.status(201).json({ supplier });
});

router.post('/:id/requests', requirePermission('inventory'), async (req, res) => {
  const request = await createSupplyRequest(req.params.id, req.user, req.body.message, 'admin');
  res.status(201).json({ request });
});

router.get('/:id', requirePermission('inventory'), async (req, res) => {
  res.json(await getSupplier(req.params.id));
});

router.patch('/:id', requirePermission('inventory'), async (req, res) => {
  if (req.body.status && req.user.role !== 'admin') {
    throw new HttpError(403, 'Only an admin can approve or decline suppliers');
  }
  const supplier = await updateSupplier(req.params.id, req.body, {
    allowStatus: req.user.role === 'admin',
    reviewer: req.user
  });
  res.json({ supplier });
});

export default router;
