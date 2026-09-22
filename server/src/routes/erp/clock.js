import { Router } from 'express';
import mongoose from 'mongoose';
import { ClockEntry } from '../../models/ClockEntry.js';
import { User } from '../../models/User.js';
import { Order } from '../../models/Order.js';
import { HttpError } from '../../middleware/error.js';
import { ROLES } from '@khalyx/shared';
import { annotateClockIn, hoursOf } from '../../services/hr.js';

const router = Router();
const OPEN = { clockOut: { $exists: false } };

async function resolveStaff(req) {
  if (req.body?.pin) {
    const staff = await User.find({
      role: { $in: [ROLES.ADMIN, ROLES.STAFF] },
      isActive: true,
      pin: { $ne: '' }
    }).select('+pin name email role staffTitle');
    for (const user of staff) {
      if (await user.matchPin(req.body.pin)) return user;
    }
    throw new HttpError(401, 'Invalid PIN');
  }
  if (req.body?.staffId) {
    const user = await User.findById(req.body.staffId);
    if (!user) throw new HttpError(404, 'Staff not found');
    return user;
  }
  return req.user;
}

router.get('/me', async (req, res) => {
  const open = await ClockEntry.findOne({ user: req.user._id, ...OPEN });
  const recent = await ClockEntry.find({ user: req.user._id }).sort({ clockIn: -1 }).limit(14);
  res.json({
    open,
    recent: recent.map((e) => ({ ...e.toObject(), hours: hoursOf(e) }))
  });
});

router.get('/who', async (_req, res) => {
  const open = await ClockEntry.find({ clockOut: { $exists: false } }).populate('user', 'name email role staffTitle');
  res.json({ onShift: open });
});

router.get('/summary', async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 7 * 864e5);
  const to = req.query.to ? new Date(req.query.to) : new Date();
  to.setHours(23, 59, 59, 999);
  const userId = new mongoose.Types.ObjectId(String(req.query.staff || req.user._id));
  const entries = await ClockEntry.find({ user: userId, clockIn: { $gte: from, $lte: to } }).sort({ clockIn: -1 });
  const hours = entries.reduce((s, e) => s + hoursOf(e), 0);
  const sales = await Order.aggregate([
    {
      $match: {
        channel: 'pos',
        soldBy: userId,
        status: { $in: ['paid', 'processing', 'shipped', 'delivered'] },
        paidAt: { $gte: from, $lte: to }
      }
    },
    { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
  ]);
  res.json({
    entries: entries.map((e) => ({ ...e.toObject(), hours: hoursOf(e) })),
    hours: Math.round(hours * 100) / 100,
    sales: { revenue: sales[0]?.revenue || 0, orders: sales[0]?.orders || 0 }
  });
});

router.post('/in', async (req, res) => {
  const staff = await resolveStaff(req);
  const existing = await ClockEntry.findOne({ user: staff._id, clockOut: { $exists: false } });
  if (existing) throw new HttpError(409, 'Already clocked in');
  const now = new Date();
  const meta = await annotateClockIn(staff._id, now);
  const entry = await ClockEntry.create({
    user: staff._id,
    clockIn: now,
    location: req.body.location || 'store',
    late: meta.late,
    shiftName: meta.shiftName,
    scheduledStart: meta.scheduledStart
  });
  res.status(201).json({ entry: await entry.populate('user', 'name'), late: meta.late, shiftName: meta.shiftName });
});

router.post('/out', async (req, res) => {
  const staff = await resolveStaff(req);
  const entry = await ClockEntry.findOne({ user: staff._id, clockOut: { $exists: false } });
  if (!entry) throw new HttpError(409, 'Not clocked in');
  const openBreak = (entry.breaks || []).find((b) => !b.end);
  if (openBreak) openBreak.end = new Date();
  entry.clockOut = new Date();
  await entry.save();
  res.json({ entry, hours: hoursOf(entry) });
});

router.post('/break/start', async (req, res) => {
  const staff = await resolveStaff(req);
  const entry = await ClockEntry.findOne({ user: staff._id, clockOut: { $exists: false } });
  if (!entry) throw new HttpError(409, 'Not clocked in');
  if ((entry.breaks || []).some((b) => !b.end)) throw new HttpError(409, 'Already on break');
  entry.breaks.push({ start: new Date() });
  await entry.save();
  res.json({ entry });
});

router.post('/break/end', async (req, res) => {
  const staff = await resolveStaff(req);
  const entry = await ClockEntry.findOne({ user: staff._id, clockOut: { $exists: false } });
  if (!entry) throw new HttpError(409, 'Not clocked in');
  const openBreak = (entry.breaks || []).find((b) => !b.end);
  if (!openBreak) throw new HttpError(409, 'Not on break');
  openBreak.end = new Date();
  await entry.save();
  res.json({ entry });
});

export default router;
