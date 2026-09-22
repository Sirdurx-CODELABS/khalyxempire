import mongoose from 'mongoose';
import { WEEKDAYS } from '@khalyx/shared';

const weekly = {};
for (const day of WEEKDAYS) {
  weekly[day.id] = { type: mongoose.Schema.Types.ObjectId, ref: 'ShiftType', default: null };
}

const staffScheduleSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    mode: { type: String, enum: ['fixed', 'weekly'], default: 'fixed' },
    fixedShift: { type: mongoose.Schema.Types.ObjectId, ref: 'ShiftType' },
    daysOff: [{ type: String, enum: WEEKDAYS.map((d) => d.id) }],
    weekly
  },
  { timestamps: true }
);

export const StaffSchedule = mongoose.model('StaffSchedule', staffScheduleSchema);
