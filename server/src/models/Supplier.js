import mongoose from 'mongoose';
import { SUPPLIER_CATEGORIES, SUPPLIER_STATUSES } from '@khalyx/shared';

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    category: { type: String, enum: SUPPLIER_CATEGORIES, default: 'other' },
    tags: [{ type: String, trim: true }],
    address: { type: String, default: '' },
    paymentTerms: { type: String, default: 'Net 30' },
    balance: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    status: { type: String, enum: SUPPLIER_STATUSES, default: 'pending', index: true },
    submittedFrom: { type: String, enum: ['admin', 'erp'], default: 'erp' },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNote: { type: String, default: '' }
  },
  { timestamps: true }
);

export const Supplier = mongoose.model('Supplier', supplierSchema);
