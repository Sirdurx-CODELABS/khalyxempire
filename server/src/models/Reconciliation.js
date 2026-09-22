import mongoose from 'mongoose';

const reconciliationSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expectedCash: { type: Number, default: 0 },
    expectedCard: { type: Number, default: 0 },
    expectedTransfer: { type: Number, default: 0 },
    expectedTotal: { type: Number, default: 0 },
    countedCash: { type: Number, default: 0 },
    countedCard: { type: Number, default: 0 },
    countedTransfer: { type: Number, default: 0 },
    countedTotal: { type: Number, default: 0 },
    discrepancy: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    closedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

reconciliationSchema.index({ date: 1, staff: 1 }, { unique: true });

export const Reconciliation = mongoose.model('Reconciliation', reconciliationSchema);
