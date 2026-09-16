import { Router } from 'express';
import { SyncQueue } from '../../models/SyncQueue.js';
import { completePosSale } from '../../services/pos.js';
import { adjustStock } from '../../services/inventory.js';
import { ClockEntry } from '../../models/ClockEntry.js';

const router = Router();

async function runAction(user, item) {
  const { action, payload } = item;
  if (action === 'pos.sale') {
    const order = await completePosSale({ staff: user, ...payload });
    return { order };
  }
  if (action === 'inventory.adjust') {
    const product = await adjustStock(payload);
    return { productId: product._id };
  }
  if (action === 'clock.in') {
    const existing = await ClockEntry.findOne({ user: user._id, clockOut: { $exists: false } });
    if (existing) return { entry: existing, already: true };
    const entry = await ClockEntry.create({ user: user._id, clockIn: new Date(), location: payload?.location || 'store' });
    return { entry };
  }
  if (action === 'clock.out') {
    const entry = await ClockEntry.findOne({ user: user._id, clockOut: { $exists: false } });
    if (entry) {
      entry.clockOut = new Date();
      await entry.save();
    }
    return { entry };
  }
  return { skipped: true };
}

router.post('/', async (req, res) => {
  const clientId = req.body.clientId || req.headers['x-erp-client'] || '';
  const items = req.body.items || [];
  const results = [];

  for (const item of items) {
    const clientItemId = item.clientItemId || item.id;
    if (clientId && clientItemId) {
      const existing = await SyncQueue.findOne({ clientId, clientItemId, status: 'synced' });
      if (existing) {
        results.push({ clientItemId, status: 'synced', duplicate: true, result: existing.result });
        continue;
      }
    }

    const doc = await SyncQueue.create({
      action: item.action,
      payload: item.payload || {},
      clientId,
      clientItemId,
      status: 'pending',
      attempts: 1
    });

    try {
      const result = await runAction(req.user, item);
      doc.status = 'synced';
      doc.result = result;
      await doc.save();
      results.push({ clientItemId, status: 'synced', result });
    } catch (err) {
      doc.status = 'failed';
      doc.lastError = err.message;
      await doc.save();
      results.push({ clientItemId, status: 'failed', error: err.message });
    }
  }

  res.json({ results });
});

router.get('/pending', async (req, res) => {
  const pending = await SyncQueue.find({ status: { $in: ['pending', 'failed'] } }).sort({ createdAt: -1 }).limit(50);
  res.json({ pending });
});

export default router;
