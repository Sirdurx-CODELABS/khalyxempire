import { Router } from 'express';
import { InventoryMovement } from '../../models/InventoryMovement.js';
import { HttpError } from '../../middleware/error.js';
import { requirePermission } from '../../middleware/admin.js';
import { adjustStock } from '../../services/inventory.js';
import {
  getInventoryProduct,
  listInventory,
  requestProductSupply,
  updateThresholds
} from '../../services/inventoryAdmin.js';

const router = Router();
router.use(requirePermission('inventory'));

router.get('/', async (req, res) => {
  const data = await listInventory({
    q: req.query.q,
    category: req.query.category,
    status: req.query.status,
    supplier: req.query.supplier
  });
  res.json(data);
});

router.post('/adjust', async (req, res) => {
  const { productId, variantId, qty, note, reason, costPrice } = req.body;
  if (!productId || !variantId) throw new HttpError(400, 'Product and variant are required');
  if (!reason) throw new HttpError(400, 'A reason is required');
  const product = await adjustStock({
    productId,
    variantId,
    qty,
    note,
    reason,
    costPrice,
    userId: req.user._id
  });
  const detail = await getInventoryProduct(product._id);
  const variant = product.variants.id(variantId);
  res.json({
    item: {
      productId: product._id,
      name: product.name,
      variantId: variant._id,
      sku: variant.sku,
      stock: variant.stock,
      reserved: variant.reserved
    },
    ...detail
  });
});

router.get('/movements', async (req, res) => {
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.product) filter.product = req.query.product;
  const movements = await InventoryMovement.find(filter)
    .populate('product', 'name')
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({ movements });
});

router.get('/:id', async (req, res) => {
  res.json(await getInventoryProduct(req.params.id));
});

router.patch('/:id/thresholds', async (req, res) => {
  const variants = Array.isArray(req.body.variants) ? req.body.variants : [];
  res.json(await updateThresholds(req.params.id, variants));
});

router.post('/:id/supply-request', async (req, res) => {
  const request = await requestProductSupply(req.params.id, req.user, req.body);
  res.status(201).json({ request });
});

export default router;
