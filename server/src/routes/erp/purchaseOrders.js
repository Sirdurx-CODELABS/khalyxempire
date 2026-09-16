import { Router } from 'express';
import { generatePoNumber } from '@khalyx/shared';
import { PurchaseOrder } from '../../models/PurchaseOrder.js';
import { Product } from '../../models/Product.js';
import { HttpError } from '../../middleware/error.js';
import { adjustStock } from '../../services/inventory.js';

const router = Router();

router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const orders = await PurchaseOrder.find(filter).populate('supplier', 'name phone').sort({ createdAt: -1 });
  res.json({ purchaseOrders: orders });
});

router.post('/', async (req, res) => {
  if (!req.body.supplier) throw new HttpError(400, 'Supplier is required');
  const items = [];
  for (const line of req.body.items || []) {
    const product = await Product.findById(line.productId);
    if (!product) throw new HttpError(404, 'Product not found');
    const variant = product.variants.id(line.variantId);
    if (!variant) throw new HttpError(400, 'Variant not found');
    items.push({
      product: product._id,
      variantId: variant._id,
      sku: variant.sku,
      name: `${product.name} ${variant.size} ${variant.color}`.trim(),
      qtyOrdered: Number(line.qtyOrdered) || 1,
      qtyReceived: 0,
      unitCost: Number(line.unitCost) || 0
    });
  }
  const po = await PurchaseOrder.create({
    poNumber: generatePoNumber(),
    supplier: req.body.supplier,
    status: req.body.status || 'ordered',
    items,
    expectedAt: req.body.expectedAt || undefined,
    notes: req.body.notes || ''
  });
  res.status(201).json({ purchaseOrder: await po.populate('supplier', 'name phone email') });
});

router.get('/:id', async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id).populate('supplier');
  if (!po) throw new HttpError(404, 'Purchase order not found');
  res.json({ purchaseOrder: po });
});

router.patch('/:id', async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw new HttpError(404, 'Purchase order not found');
  if (req.body.status) po.status = req.body.status;
  if (req.body.notes !== undefined) po.notes = req.body.notes;
  if (req.body.expectedAt) po.expectedAt = req.body.expectedAt;
  await po.save();
  res.json({ purchaseOrder: po });
});

router.post('/:id/receive', async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw new HttpError(404, 'Purchase order not found');
  if (po.status === 'cancelled' || po.status === 'received') {
    throw new HttpError(409, 'This purchase order cannot receive more stock');
  }
  const incoming = req.body.items || [];
  for (const line of incoming) {
    const item = po.items.id(line.itemId) || po.items.find((i) => String(i.variantId) === String(line.variantId));
    if (!item) throw new HttpError(400, 'PO line not found');
    const qty = Math.max(0, Number(line.qty) || 0);
    if (!qty) continue;
    const remaining = item.qtyOrdered - item.qtyReceived;
    const apply = Math.min(remaining, qty);
    if (apply <= 0) continue;
    await adjustStock({
      productId: item.product,
      variantId: item.variantId,
      qty: apply,
      note: `Received ${po.poNumber}`
    });
    item.qtyReceived += apply;
  }
  const fully = po.items.every((i) => i.qtyReceived >= i.qtyOrdered);
  const any = po.items.some((i) => i.qtyReceived > 0);
  po.status = fully ? 'received' : any ? 'partial' : po.status;
  await po.save();
  res.json({ purchaseOrder: await po.populate('supplier', 'name') });
});

export default router;
