import { Router } from 'express';
import { listInventory, getInventoryProduct } from '../../services/inventoryAdmin.js';
import { HttpError } from '../../middleware/error.js';

const router = Router();

router.get('/', async (req, res) => {
  const data = await listInventory({
    q: req.query.q,
    category: req.query.category,
    status: req.query.status,
    supplier: req.query.supplier
  });
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const detail = await getInventoryProduct(req.params.id);
  if (!detail) throw new HttpError(404, 'Product not found');
  res.json(detail);
});

export default router;
