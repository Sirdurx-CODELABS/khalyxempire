import mongoose from 'mongoose';
import { SUPPLY_REQUEST_STATUSES } from '@khalyx/shared';

const supplyRequestSchema = new mongoose.Schema(
  {
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    source: { type: String, enum: ['admin', 'erp'], default: 'erp' },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: SUPPLY_REQUEST_STATUSES, default: 'pending', index: true },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    handledAt: Date,
    seenAt: Date,
    seenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export const SupplyRequest = mongoose.model('SupplyRequest', supplyRequestSchema);
