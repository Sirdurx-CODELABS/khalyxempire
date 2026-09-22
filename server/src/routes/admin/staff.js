import { Router } from 'express';
import {
  ROLES,
  PERMISSIONS,
  STAFF_TITLES,
  ACCESS_MODES,
  accountConfig,
  permissionsForTitle
} from '@khalyx/shared';
import { User } from '../../models/User.js';
import { Order } from '../../models/Order.js';
import { ClockEntry } from '../../models/ClockEntry.js';
import { ShiftType } from '../../models/ShiftType.js';
import { ShiftSettings } from '../../models/ShiftSettings.js';
import { StaffSchedule } from '../../models/StaffSchedule.js';
import { HttpError } from '../../middleware/error.js';
import { requireAdmin, requirePermission, publicUser } from '../../middleware/admin.js';
import { createManagedAccount } from '../../services/accounts.js';
import {
  ensureShiftDefaults,
  publicShift,
  publicSchedule,
  buildCalendar,
  buildAttendance,
  buildPerformance,
  buildOverview,
  startOfWeek,
  hoursOf
} from '../../services/hr.js';
import { sendCsv } from '../../utils/csv.js';

const router = Router();
router.use(requirePermission('staff'));

function mutate(req, _res, next) {
  if (req.user.role !== ROLES.ADMIN) throw new HttpError(403, 'Only admins can change staff accounts and shifts');
  next();
}

router.get('/', async (req, res) => {
  const { q, access, title, kind } = req.query;
  const filter = { role: { $in: [ROLES.ADMIN, ROLES.STAFF] } };
  if (kind === 'store') filter.role = ROLES.CUSTOMER;
  else if (kind === 'erp') filter.apps = 'erp';
  else if (kind === 'admin') filter.apps = 'admin';
  if (title) filter.staffTitle = title;
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } }
    ];
  }
  const users = await User.find(filter).select('+pin').sort({ name: 1 }).limit(300);
  const schedules = await StaffSchedule.find({ user: { $in: users.map((u) => u._id) } }).populate('fixedShift');
  const byUser = Object.fromEntries(schedules.map((s) => [String(s.user), s]));
  let rows = users.map((u) => ({
    ...publicUser(u),
    hasPin: Boolean(u.pin),
    schedule: publicSchedule(byUser[String(u._id)])
  }));
  if (access === ACCESS_MODES.ADMIN || access === ACCESS_MODES.ERP || access === ACCESS_MODES.BOTH) {
    rows = rows.filter((u) => u.access === access);
  }
  res.json({
    users: rows,
    permissions: PERMISSIONS,
    titles: STAFF_TITLES,
    accessModes: Object.values(ACCESS_MODES)
  });
});

router.get('/overview', async (_req, res) => {
  res.json(await buildOverview());
});

router.get('/calendar', async (req, res) => {
  res.json(await buildCalendar(req.query.from ? new Date(req.query.from) : new Date()));
});

router.get('/attendance', async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : startOfWeek();
  const to = req.query.to ? new Date(req.query.to) : new Date();
  res.json(await buildAttendance({ from, to, staffId: req.query.staff || undefined }));
});

router.get('/attendance/export', async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : startOfWeek();
  const to = req.query.to ? new Date(req.query.to) : new Date();
  const data = await buildAttendance({ from, to, staffId: req.query.staff });
  const rows = [];
  for (const person of data.staff) {
    for (const day of person.days) {
      rows.push({
        name: person.name,
        email: person.email,
        role: person.title,
        date: day.date,
        status: day.status,
        shift: day.shift?.name || '',
        clockIn: day.clockIn ? new Date(day.clockIn).toLocaleString('en-NG') : '',
        hours: day.hours,
        present: person.summary.present,
        absent: person.summary.absent,
        late: person.summary.late,
        attendanceRate: person.summary.attendanceRate
      });
    }
  }
  sendCsv(res, `khalyx-attendance-${data.from}-${data.to}.csv`, rows);
});

router.get('/performance', async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : startOfWeek();
  const to = req.query.to ? new Date(req.query.to) : new Date();
  res.json(await buildPerformance({ from, to }));
});

router.get('/shifts', async (_req, res) => {
  const { types, settings } = await ensureShiftDefaults();
  res.json({
    shifts: types.map(publicShift),
    settings: {
      graceMinutes: settings.graceMinutes,
      defaultShift: settings.defaultShift ? String(settings.defaultShift._id || settings.defaultShift) : '',
      assignDefaultOnCreate: settings.assignDefaultOnCreate
    }
  });
});

router.post('/shifts', mutate, async (req, res) => {
  if (!req.body.name || !req.body.startTime || !req.body.endTime) {
    throw new HttpError(400, 'Shift name, start and end times are required');
  }
  const shift = await ShiftType.create({
    name: req.body.name,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    color: req.body.color || '#d4af37',
    sortOrder: Number(req.body.sortOrder) || 0
  });
  res.status(201).json({ shift: publicShift(shift) });
});

router.patch('/shifts/:id', mutate, async (req, res) => {
  const shift = await ShiftType.findById(req.params.id);
  if (!shift) throw new HttpError(404, 'Shift not found');
  for (const key of ['name', 'startTime', 'endTime', 'color', 'sortOrder', 'isActive']) {
    if (req.body[key] !== undefined) shift[key] = req.body[key];
  }
  await shift.save();
  res.json({ shift: publicShift(shift) });
});

router.delete('/shifts/:id', mutate, async (req, res) => {
  const shift = await ShiftType.findByIdAndDelete(req.params.id);
  if (!shift) throw new HttpError(404, 'Shift not found');
  res.json({ ok: true });
});

router.patch('/shift-settings', mutate, async (req, res) => {
  const { settings } = await ensureShiftDefaults();
  if (req.body.graceMinutes !== undefined) settings.graceMinutes = Math.max(0, Number(req.body.graceMinutes) || 0);
  if (req.body.defaultShift !== undefined) settings.defaultShift = req.body.defaultShift || undefined;
  if (req.body.assignDefaultOnCreate !== undefined) settings.assignDefaultOnCreate = Boolean(req.body.assignDefaultOnCreate);
  await settings.save();
  res.json({
    settings: {
      graceMinutes: settings.graceMinutes,
      defaultShift: settings.defaultShift ? String(settings.defaultShift) : '',
      assignDefaultOnCreate: settings.assignDefaultOnCreate
    }
  });
});

router.post('/', mutate, async (req, res) => {
  const user = await createManagedAccount({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    phone: req.body.phone,
    avatar: req.body.avatar,
    accountType: req.body.accountType || req.body.role,
    access: req.body.access,
    permissions: req.body.permissions,
    pin: req.body.pin,
    staffTitle: req.body.staffTitle,
    invite: Boolean(req.body.invite)
  });
  res.status(201).json({ user });
});

router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('+pin');
  if (!user) throw new HttpError(404, 'Staff not found');
  const [clocks, sales, [perf], schedule, attendance] = await Promise.all([
    ClockEntry.find({ user: user._id }).sort({ clockIn: -1 }).limit(40),
    Order.find({
      soldBy: user._id,
      channel: 'pos',
      status: { $in: ['paid', 'processing', 'shipped', 'delivered'] }
    })
      .sort({ paidAt: -1 })
      .limit(20),
    Order.aggregate([
      { $match: { soldBy: user._id, channel: 'pos', status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } } },
      { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
    ]),
    StaffSchedule.findOne({ user: user._id }).populate('fixedShift'),
    buildAttendance({ from: startOfWeek(), to: new Date(), staffId: user._id })
  ]);
  res.json({
    user: { ...publicUser(user), hasPin: Boolean(user.pin) },
    schedule: publicSchedule(schedule),
    clocks: clocks.map((e) => ({ ...e.toObject(), hours: hoursOf(e) })),
    sales,
    attendance: attendance.staff[0] || null,
    performance: { revenue: perf?.revenue || 0, orders: perf?.orders || 0 }
  });
});

router.patch('/:id/schedule', mutate, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'Staff not found');
  const weekly = {};
  for (const [key, value] of Object.entries(req.body.weekly || {})) {
    weekly[key] = value || null;
  }
  const schedule = await StaffSchedule.findOneAndUpdate(
    { user: user._id },
    {
      mode: req.body.mode === 'weekly' ? 'weekly' : 'fixed',
      fixedShift: req.body.fixedShift || null,
      daysOff: req.body.daysOff || [],
      weekly
    },
    { upsert: true, new: true }
  );
  res.json({ schedule: publicSchedule(schedule) });
});

router.patch('/:id', mutate, async (req, res) => {
  const user = await User.findById(req.params.id).select('+password +pin');
  if (!user) throw new HttpError(404, 'User not found');
  if (req.body.name) user.name = req.body.name;
  if (req.body.phone !== undefined) user.phone = req.body.phone;
  if (req.body.avatar !== undefined) user.avatar = req.body.avatar;
  if (req.body.staffTitle !== undefined) user.staffTitle = req.body.staffTitle;
  if (req.body.pin) user.pin = req.body.pin;
  if (req.body.isActive !== undefined) {
    if (String(user._id) === String(req.user._id) && req.body.isActive === false) {
      throw new HttpError(400, 'You cannot deactivate yourself');
    }
    user.isActive = req.body.isActive;
  }
  const access = req.body.access;
  const roleSource = req.body.staffTitle === 'admin' || req.body.accountType === 'admin' || req.body.role === 'admin' ? 'admin' : req.body.accountType || req.body.role;
  if (access || (req.body.role && req.body.role !== user.role) || req.body.accountType) {
    if (String(user._id) === String(req.user._id)) throw new HttpError(400, 'You cannot change your own access');
    const next = accountConfig(roleSource || user.staffTitle || user.role, access);
    user.role = next.role;
    user.apps = next.apps;
    if (next.role === ROLES.ADMIN) user.permissions = PERMISSIONS;
    else if (req.body.permissions) user.permissions = req.body.permissions;
    else if (req.body.staffTitle) user.permissions = permissionsForTitle(req.body.staffTitle);
  } else if (req.body.permissions && user.role !== ROLES.CUSTOMER) {
    if (user.role === ROLES.ADMIN) user.permissions = PERMISSIONS;
    else user.permissions = req.body.permissions;
  }
  if (req.body.password) user.password = req.body.password;
  await user.save();
  res.json({ user: publicUser(user) });
});

router.delete('/:id', mutate, async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw new HttpError(400, 'You cannot delete yourself');
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'Staff not found');
  if (user.role === ROLES.CUSTOMER) throw new HttpError(400, 'Use Customers to remove shoppers');
  await StaffSchedule.deleteOne({ user: user._id });
  await user.deleteOne();
  res.json({ ok: true });
});

export default router;
