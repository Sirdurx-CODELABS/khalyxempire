import mongoose from 'mongoose';
import { WEEKDAYS, ROLES, accessFromApps, appsFor } from '@khalyx/shared';
import { ShiftType } from '../models/ShiftType.js';
import { ShiftSettings } from '../models/ShiftSettings.js';
import { StaffSchedule } from '../models/StaffSchedule.js';
import { ClockEntry } from '../models/ClockEntry.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { HttpError } from '../middleware/error.js';

const COUNTED = { status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } };

export function dayKey(date) {
  const idx = new Date(date).getDay();
  return WEEKDAYS[idx]?.id || 'sun';
}

export function dateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfWeek(date = new Date()) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function atTime(date, hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  const d = new Date(date);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function hoursOf(entry) {
  const end = entry.clockOut ? new Date(entry.clockOut) : new Date();
  let ms = end - new Date(entry.clockIn);
  for (const br of entry.breaks || []) {
    const bEnd = br.end ? new Date(br.end) : new Date();
    ms -= Math.max(0, bEnd - new Date(br.start));
  }
  return Math.max(0, ms / 36e5);
}

export async function ensureShiftDefaults() {
  let types = await ShiftType.find().sort({ sortOrder: 1, name: 1 });
  if (!types.length) {
    types = await ShiftType.insertMany([
      { name: 'Morning', startTime: '08:00', endTime: '16:00', color: '#d4af37', sortOrder: 1 },
      { name: 'Evening', startTime: '16:00', endTime: '00:00', color: '#6b6458', sortOrder: 2 },
      { name: 'Night', startTime: '00:00', endTime: '08:00', color: '#1a1a1a', sortOrder: 3 }
    ]);
  }
  let settings = await ShiftSettings.findOne({ key: 'default' });
  if (!settings) {
    settings = await ShiftSettings.create({
      key: 'default',
      graceMinutes: 10,
      defaultShift: types[0]?._id,
      assignDefaultOnCreate: false
    });
  }
  return { types, settings: await settings.populate('defaultShift') };
}

export async function getShiftSettings() {
  const { settings, types } = await ensureShiftDefaults();
  return { settings, types };
}

export function publicShift(shift) {
  if (!shift) return null;
  return {
    id: String(shift._id),
    name: shift.name,
    startTime: shift.startTime,
    endTime: shift.endTime,
    color: shift.color,
    sortOrder: shift.sortOrder,
    isActive: shift.isActive
  };
}

export function publicSchedule(doc) {
  if (!doc) return null;
  const weekly = {};
  for (const day of WEEKDAYS) {
    const value = doc.weekly?.[day.id];
    weekly[day.id] = value ? String(value._id || value) : '';
  }
  return {
    id: String(doc._id),
    user: String(doc.user._id || doc.user),
    mode: doc.mode,
    fixedShift: doc.fixedShift ? String(doc.fixedShift._id || doc.fixedShift) : '',
    daysOff: doc.daysOff || [],
    weekly
  };
}

export function shiftForDate(schedule, typesById, date) {
  if (!schedule) return null;
  const key = dayKey(date);
  if (schedule.mode === 'weekly') {
    const id = schedule.weekly?.[key];
    return id ? typesById.get(String(id._id || id)) || null : null;
  }
  if ((schedule.daysOff || []).includes(key)) return null;
  return schedule.fixedShift ? typesById.get(String(schedule.fixedShift._id || schedule.fixedShift)) || null : null;
}

export async function shiftForUser(userId, date = new Date()) {
  const [{ types }, schedule] = await Promise.all([
    ensureShiftDefaults(),
    StaffSchedule.findOne({ user: userId })
  ]);
  const typesById = new Map(types.map((t) => [String(t._id), t]));
  return shiftForDate(schedule, typesById, date);
}

export async function annotateClockIn(userId, at = new Date()) {
  const [{ settings }, shift] = await Promise.all([ensureShiftDefaults(), shiftForUser(userId, at)]);
  if (!shift) return { late: false, shiftName: '', scheduledStart: '' };
  const start = atTime(at, shift.startTime);
  const graceMs = (settings.graceMinutes || 0) * 60 * 1000;
  return {
    late: at.getTime() > start.getTime() + graceMs,
    shiftName: shift.name,
    scheduledStart: shift.startTime
  };
}

export async function applyDefaultSchedule(userId) {
  const { settings } = await ensureShiftDefaults();
  if (!settings.assignDefaultOnCreate || !settings.defaultShift) return null;
  return StaffSchedule.findOneAndUpdate(
    { user: userId },
    { mode: 'fixed', fixedShift: settings.defaultShift, daysOff: ['sun'], weekly: {} },
    { upsert: true, new: true }
  );
}

function eachDate(from, to) {
  const dates = [];
  const cursor = startOfDay(from);
  const last = startOfDay(to);
  while (cursor <= last) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export async function buildCalendar(weekStart) {
  const start = startOfWeek(weekStart);
  const days = eachDate(start, new Date(start.getTime() + 6 * 864e5));
  const [{ types }, staff, schedules] = await Promise.all([
    ensureShiftDefaults(),
    User.find({ role: { $in: [ROLES.ADMIN, ROLES.STAFF] }, isActive: true }).sort({ name: 1 }),
    StaffSchedule.find()
  ]);
  const typesById = new Map(types.map((t) => [String(t._id), t]));
  const scheduleByUser = new Map(schedules.map((s) => [String(s.user), s]));
  return {
    weekStart: dateKey(start),
    days: days.map((d) => ({ date: dateKey(d), label: d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric' }), day: dayKey(d) })),
    shifts: types.map(publicShift),
    rows: staff.map((user) => ({
      userId: String(user._id),
      name: user.name,
      title: user.staffTitle || user.role,
      days: days.map((d) => {
        const shift = shiftForDate(scheduleByUser.get(String(user._id)), typesById, d);
        return shift ? publicShift(shift) : null;
      })
    }))
  };
}

export async function buildAttendance({ from, to, staffId }) {
  const start = startOfDay(from || new Date());
  let end = endOfDay(to || new Date());
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new HttpError(400, 'Invalid attendance date range');
  }
  if (end < start) end = endOfDay(start);
  const maxMs = 93 * 864e5;
  if (end - start > maxMs) end = new Date(start.getTime() + maxMs);
  const dates = eachDate(start, end);
  const filter = { role: { $in: [ROLES.ADMIN, ROLES.STAFF] } };
  if (staffId) {
    if (!mongoose.Types.ObjectId.isValid(String(staffId))) throw new HttpError(400, 'Invalid staff id');
    filter._id = staffId;
  }
  const [{ types, settings }, staff, schedules, clocks] = await Promise.all([
    ensureShiftDefaults(),
    User.find(filter).sort({ name: 1 }),
    StaffSchedule.find(staffId ? { user: staffId } : {}),
    ClockEntry.find({ clockIn: { $gte: start, $lte: end }, ...(staffId ? { user: staffId } : {}) })
  ]);
  const typesById = new Map(types.map((t) => [String(t._id), t]));
  const scheduleByUser = new Map(schedules.map((s) => [String(s.user), s]));
  const clocksByUser = {};
  for (const entry of clocks) {
    const uid = String(entry.user);
    const key = dateKey(entry.clockIn);
    clocksByUser[uid] ??= {};
    clocksByUser[uid][key] ??= [];
    clocksByUser[uid][key].push(entry);
  }

  const staffRows = staff.map((user) => {
    const uid = String(user._id);
    let present = 0;
    let absent = 0;
    let late = 0;
    let off = 0;
    let hours = 0;
    const days = dates.map((d) => {
      const key = dateKey(d);
      const shift = shiftForDate(scheduleByUser.get(uid), typesById, d);
      const entries = clocksByUser[uid]?.[key] || [];
      const worked = entries.reduce((s, e) => s + hoursOf(e), 0);
      hours += worked;
      const firstIn = entries[0] ? new Date(entries[0].clockIn) : null;
      let status = 'off';
      if (!shift && entries.length) status = 'unscheduled';
      else if (!shift) {
        status = 'off';
        off += 1;
      } else if (!entries.length) {
        status = d > new Date() ? 'upcoming' : 'absent';
        if (status === 'absent') absent += 1;
      } else {
        const graceMs = (settings.graceMinutes || 0) * 60 * 1000;
        const startAt = atTime(d, shift.startTime);
        const isLate = entries.some((e) => e.late) || (firstIn && firstIn.getTime() > startAt.getTime() + graceMs);
        status = isLate ? 'late' : 'present';
        present += 1;
        if (isLate) late += 1;
      }
      return {
        date: key,
        status,
        hours: Math.round(worked * 100) / 100,
        clockIn: firstIn ? firstIn.toISOString() : null,
        shift: shift ? publicShift(shift) : null
      };
    });
    const scheduled = present + absent;
    return {
      userId: uid,
      name: user.name,
      email: user.email,
      title: user.staffTitle || user.role,
      days,
      summary: {
        hours: Math.round(hours * 100) / 100,
        present,
        absent,
        late,
        off,
        scheduled,
        attendanceRate: scheduled ? Math.round((present / scheduled) * 100) : 0
      }
    };
  });

  return {
    from: dateKey(start),
    to: dateKey(end),
    dates: dates.map(dateKey),
    graceMinutes: settings.graceMinutes,
    staff: staffRows
  };
}

export async function buildPerformance({ from, to }) {
  const attendance = await buildAttendance({ from, to });
  const start = startOfDay(from);
  const end = endOfDay(to);
  const sales = await Order.aggregate([
    { $match: { channel: 'pos', ...COUNTED, paidAt: { $gte: start, $lte: end } } },
    { $group: { _id: '$soldBy', revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
  ]);
  const salesMap = Object.fromEntries(sales.map((s) => [String(s._id), s]));
  return {
    from: attendance.from,
    to: attendance.to,
    rows: attendance.staff.map((row) => ({
      userId: row.userId,
      name: row.name,
      title: row.title,
      revenue: salesMap[row.userId]?.revenue || 0,
      orders: salesMap[row.userId]?.orders || 0,
      hours: row.summary.hours,
      present: row.summary.present,
      absent: row.summary.absent,
      late: row.summary.late,
      attendanceRate: row.summary.attendanceRate
    }))
  };
}

export async function buildOverview() {
  const today = new Date();
  const [{ types }, open, attendance] = await Promise.all([
    ensureShiftDefaults(),
    ClockEntry.find({ clockOut: { $exists: false } }).populate('user', 'name staffTitle email avatar'),
    buildAttendance({ from: today, to: today })
  ]);
  return {
    now: new Date(),
    shiftCount: types.length,
    onShift: open.map((e) => ({
      id: e._id,
      name: e.user?.name,
      title: e.user?.staffTitle,
      clockIn: e.clockIn,
      late: e.late,
      shiftName: e.shiftName
    })),
    today: {
      present: attendance.staff.filter((s) => ['present', 'late', 'unscheduled'].includes(s.days[0]?.status)).length,
      late: attendance.staff.filter((s) => s.days[0]?.status === 'late').length,
      absent: attendance.staff.filter((s) => s.days[0]?.status === 'absent').length,
      scheduled: attendance.staff.filter((s) => s.days[0]?.shift).length
    }
  };
}

export function staffAccess(user) {
  return accessFromApps(appsFor(user));
}
