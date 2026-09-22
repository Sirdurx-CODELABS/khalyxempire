import { Router } from 'express';
import { LabelBatch } from '../../models/LabelBatch.js';
import { HttpError } from '../../middleware/error.js';
import { requirePermission } from '../../middleware/admin.js';
import { itemsFromSelection, createLabelBatch, listLabelBatches, publicBatch } from '../../services/labels.js';

const router = Router();
router.use(requirePermission('inventory'));

router.get('/', async (req, res) => {
  const batches = await listLabelBatches({ q: req.query.q });
  res.json({ batches: batches.map((batch) => publicBatch(batch)) });
});

router.post('/', async (req, res) => {
  const items = req.body.selection?.length
    ? await itemsFromSelection(req.body.selection)
    : req.body.items;
  const batch = await createLabelBatch({
    name: req.body.name,
    notes: req.body.notes,
    items,
    createdBy: req.user._id,
    labelSize: req.body.labelSize
  });
  res.status(201).json({ batch: publicBatch(batch, { expand: true }) });
});

router.get('/:id', async (req, res) => {
  const batch = await LabelBatch.findById(req.params.id).populate('createdBy', 'name email');
  if (!batch) throw new HttpError(404, 'Label sheet not found');
  res.json({ batch: publicBatch(batch, { expand: true }) });
});

router.delete('/:id', async (req, res) => {
  const batch = await LabelBatch.findByIdAndDelete(req.params.id);
  if (!batch) throw new HttpError(404, 'Label sheet not found');
  res.json({ ok: true });
});

export default router;
