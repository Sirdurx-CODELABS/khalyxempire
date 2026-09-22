import mongoose from 'mongoose';

const clockEntrySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clockIn: { type: Date, required: true },
    clockOut: Date,
    location: { type: String, default: 'store' },
    late: { type: Boolean, default: false },
    shiftName: { type: String, default: '' },
    scheduledStart: { type: String, default: '' },
    breaks: [
      {
        start: { type: Date, required: true },
        end: Date
      }
    ]
  },
  { timestamps: true }
);

export const ClockEntry = mongoose.model('ClockEntry', clockEntrySchema);
