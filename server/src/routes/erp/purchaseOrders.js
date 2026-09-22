import { Router } from 'express';
import { generatePoNumber } from '@khalyx/shared';
import { PurchaseOrder } from '../../models/PurchaseOrder.js';
import { Product } from '../../models/Product.js';
import { HttpError } from '../../middleware/error.js';
import { adjustStock } from '../../services/inventory.js';
import { createLabelBatch, itemsFromSelection, publicBatch } from '../../services/labels.js';
import { requireApprovedSupplier } from '../../services/suppliers.js';

const router = Router();

function normalizeStatus(status) {
  if (status === 'ordered') return 'sent';
  return status;
}

router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status === 'sent' ? { $in: ['sent', 'ordered'] } : req.query.status;
  if (req.query.supplier) filter.supplier = req.query.supplier;
  const orders = await PurchaseOrder.find(filter).populate('supplier', 'name phone whatsapp category').sort({ createdAt: -1 });
  res.json({ purchaseOrders: orders });
});

router.post('/', async (req, res) => {
  if (!req.body.supplier) throw new HttpError(400, 'Supplier is required');
  await requireApprovedSupplier(req.body.supplier);
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
  const status = normalizeStatus(req.body.status || 'draft');
  const po = await PurchaseOrder.create({
    poNumber: generatePoNumber(),
    supplier: req.body.supplier,
    status,
    items,
    invoiceRef: req.body.invoiceRef || '',
    expectedAt: req.body.expectedAt || undefined,
    notes: req.body.notes || '',
    history: [{ status, note: 'Created' }]
  });
  res.status(201).json({ purchaseOrder: await po.populate('supplier', 'name phone email whatsapp') });
});

router.get('/:id', async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id).populate('supplier');
  if (!po) throw new HttpError(404, 'Purchase order not found');
  res.json({ purchaseOrder: po });
});

router.patch('/:id', async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw new HttpError(404, 'Purchase order not found');
  if (req.body.status) {
    po.status = normalizeStatus(req.body.status);
    po.history.push({ status: po.status, note: req.body.note || '' });
  }
  if (req.body.notes !== undefined) po.notes = req.body.notes;
  if (req.body.invoiceRef !== undefined) po.invoiceRef = req.body.invoiceRef;
  if (req.body.expectedAt) po.expectedAt = req.body.expectedAt;
  await po.save();
  res.json({ purchaseOrder: po });
});

router.post('/:id/receive', async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw new HttpError(404, 'Purchase order not found');
  if (['cancelled', 'closed'].includes(po.status)) {
    throw new HttpError(409, 'This purchase order cannot receive more stock');
  }
  if (req.body.invoiceRef) po.invoiceRef = req.body.invoiceRef;
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
      note: `Received ${po.poNumber}`,
      costPrice: item.unitCost,
      userId: req.user?._id,
      reason: 'received'
    });
    item.qtyReceived += apply;
  }
  const fully = po.items.every((i) => i.qtyReceived >= i.qtyOrdered);
  const any = po.items.some((i) => i.qtyReceived > 0);
  po.status = fully ? 'received' : any ? 'partial' : po.status;
  po.history.push({ status: po.status, note: 'Stock received' });
  await po.save();
  res.json({ purchaseOrder: await po.populate('supplier', 'name') });
});

router.post('/:id/labels', async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw new HttpError(404, 'Purchase order not found');
  const selection = po.items
    .filter((i) => i.qtyReceived > 0)
    .map((i) => ({ productId: i.product, variantId: i.variantId, copies: i.qtyReceived }));
  if (!selection.length) throw new HttpError(400, 'Receive stock before printing labels');
  const items = await itemsFromSelection(selection);
  const batch = await createLabelBatch({
    name: `PO ${po.poNumber}`,
    notes: 'Generated from purchase order receive',
    items,
    createdBy: req.user._id,
    purchaseOrder: po._id,
    labelSize: req.body.labelSize
  });
  res.status(201).json({ batch: publicBatch(batch, { expand: true }) });
});

export default router;
