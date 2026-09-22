import { Router } from 'express';
import {
  createSupplier,
  createSupplyRequest,
  getSupplier,
  listSuppliers,
  listSupplyRequests,
  updateSupplier
} from '../../services/suppliers.js';

const router = Router();

router.get('/', async (req, res) => {
  const suppliers = await listSuppliers({ status: req.query.status, q: req.query.q });
  res.json({ suppliers });
});

router.post('/', async (req, res) => {
  const supplier = await createSupplier(req.body, req.user, 'erp');
  res.status(201).json({ supplier });
});

router.get('/requests', async (req, res) => {
  const requests = await listSupplyRequests({ status: req.query.status, supplier: req.query.supplier });
  res.json({ requests });
});

router.get('/:id', async (req, res) => {
  res.json(await getSupplier(req.params.id));
});

router.patch('/:id', async (req, res) => {
  const { status: _status, submittedBy: _by, submittedFrom: _from, reviewedBy: _rb, ...safe } = req.body || {};
  const supplier = await updateSupplier(req.params.id, safe, { allowStatus: false });
  res.json({ supplier });
});

router.post('/:id/requests', async (req, res) => {
  const request = await createSupplyRequest(req.params.id, req.user, req.body.message, 'erp');
  res.status(201).json({ request });
});

export default router;
