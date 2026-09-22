import mongoose from 'mongoose';

const shiftTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    startTime: { type: String, required: true, default: '08:00' },
    endTime: { type: String, required: true, default: '16:00' },
    color: { type: String, default: '#d4af37' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const ShiftType = mongoose.model('ShiftType', shiftTypeSchema);
