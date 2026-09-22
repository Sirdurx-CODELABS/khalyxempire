import { Router } from 'express';
import { LabelBatch } from '../../models/LabelBatch.js';
import { HttpError } from '../../middleware/error.js';
import { listLabelBatches, publicBatch } from '../../services/labels.js';

const router = Router();

router.get('/', async (req, res) => {
  const batches = await listLabelBatches({ q: req.query.q });
  res.json({ batches: batches.map((batch) => publicBatch(batch)) });
});

router.patch('/:id/printed', async (req, res) => {
  const batch = await LabelBatch.findByIdAndUpdate(req.params.id, { printedAt: new Date() }, { new: true });
  if (!batch) throw new HttpError(404, 'Label sheet not found');
  res.json({ batch: publicBatch(batch) });
});

router.get('/:id', async (req, res) => {
  const batch = await LabelBatch.findById(req.params.id).populate('createdBy', 'name email');
  if (!batch) throw new HttpError(404, 'Label sheet not found');
  res.json({ batch: publicBatch(batch, { expand: true }) });
});

export default router;
