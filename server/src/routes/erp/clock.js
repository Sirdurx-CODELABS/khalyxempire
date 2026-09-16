import { Router } from 'express';
import { ClockEntry } from '../../models/ClockEntry.js';
import { HttpError } from '../../middleware/error.js';

const router = Router();

const OPEN = { clockOut: { $exists: false } };

router.get('/me', async (req, res) => {
  const open = await ClockEntry.findOne({ user: req.user._id, ...OPEN });
  const recent = await ClockEntry.find({ user: req.user._id }).sort({ clockIn: -1 }).limit(14);
  res.json({ open, recent });
});

router.get('/who', async (_req, res) => {
  const open = await ClockEntry.find({ clockOut: { $exists: false } }).populate('user', 'name email role');
  res.json({ onShift: open });
});

router.post('/in', async (req, res) => {
  const existing = await ClockEntry.findOne({ user: req.user._id, clockOut: { $exists: false } });
  if (existing) throw new HttpError(409, 'Already clocked in');
  const entry = await ClockEntry.create({
    user: req.user._id,
    clockIn: new Date(),
    location: req.body.location || 'store'
  });
  res.status(201).json({ entry });
});

router.post('/out', async (req, res) => {
  const entry = await ClockEntry.findOne({ user: req.user._id, clockOut: { $exists: false } });
  if (!entry) throw new HttpError(409, 'Not clocked in');
  entry.clockOut = new Date();
  await entry.save();
  res.json({ entry });
});

export default router;
