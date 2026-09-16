import { Router } from 'express';
import { Supplier } from '../../models/Supplier.js';
import { PurchaseOrder } from '../../models/PurchaseOrder.js';
import { HttpError } from '../../middleware/error.js';

const router = Router();

router.get('/', async (_req, res) => {
  const suppliers = await Supplier.find().sort({ name: 1 });
  res.json({ suppliers });
});

router.post('/', async (req, res) => {
  if (!req.body.name) throw new HttpError(400, 'Supplier name is required');
  const supplier = await Supplier.create(req.body);
  res.status(201).json({ supplier });
});

router.patch('/:id', async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!supplier) throw new HttpError(404, 'Supplier not found');
  res.json({ supplier });
});

router.get('/:id', async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw new HttpError(404, 'Supplier not found');
  const orders = await PurchaseOrder.find({ supplier: supplier._id }).sort({ createdAt: -1 });
  res.json({ supplier, purchaseOrders: orders });
});

export default router;
