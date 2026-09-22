import mongoose from 'mongoose';

const shiftSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'default' },
    graceMinutes: { type: Number, default: 10 },
    defaultShift: { type: mongoose.Schema.Types.ObjectId, ref: 'ShiftType' },
    assignDefaultOnCreate: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const ShiftSettings = mongoose.model('ShiftSettings', shiftSettingsSchema);
