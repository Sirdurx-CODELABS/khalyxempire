import { Router } from 'express';
import { Product } from '../../models/Product.js';
import { InventoryMovement } from '../../models/InventoryMovement.js';
import { HttpError } from '../../middleware/error.js';
import { requirePermission } from '../../middleware/admin.js';
import { adjustStock } from '../../services/inventory.js';

const router = Router();
router.use(requirePermission('inventory'));

router.get('/', async (req, res) => {
  const { q, low } = req.query;
  const products = await Product.find({ isActive: true }).populate('category', 'name slug').sort({ name: 1 });
  const rows = [];
  for (const product of products) {
    for (const variant of product.variants) {
      if (q) {
        const hay = `${product.name} ${variant.sku} ${variant.barcode} ${variant.size} ${variant.color}`.toLowerCase();
        if (!hay.includes(String(q).toLowerCase())) continue;
      }
      const isLow = variant.stock <= (variant.lowStockThreshold ?? 5);
      if (low === 'true' && !isLow) continue;
      rows.push({
        productId: product._id,
        name: product.name,
        category: product.category?.name,
        variantId: variant._id,
        sku: variant.sku,
        barcode: variant.barcode,
        size: variant.size,
        color: variant.color,
        stock: variant.stock,
        reserved: variant.reserved,
        threshold: variant.lowStockThreshold,
        low: isLow
      });
    }
  }
  res.json({ items: rows, lowCount: rows.filter((r) => r.low).length });
});

router.post('/adjust', async (req, res) => {
  const { productId, variantId, qty, note } = req.body;
  if (!productId || !variantId) throw new HttpError(400, 'Product and variant are required');
  const product = await adjustStock({ productId, variantId, qty, note });
  const variant = product.variants.id(variantId);
  res.json({
    item: {
      productId: product._id,
      name: product.name,
      variantId: variant._id,
      sku: variant.sku,
      stock: variant.stock,
      reserved: variant.reserved
    }
  });
});

router.get('/movements', async (req, res) => {
  const movements = await InventoryMovement.find()
    .populate('product', 'name')
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ movements });
});

export default router;
