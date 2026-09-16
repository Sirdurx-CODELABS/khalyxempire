import mongoose from 'mongoose';

const syncQueueSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending', index: true },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: '' },
    clientId: { type: String },
    clientItemId: { type: String },
    result: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

syncQueueSchema.index({ clientId: 1, clientItemId: 1 }, { unique: true, sparse: true });

export const SyncQueue = mongoose.model('SyncQueue', syncQueueSchema);
