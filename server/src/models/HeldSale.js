import mongoose from 'mongoose';

const heldSaleSchema = new mongoose.Schema(
  {
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: Array, default: [] },
    discount: { type: Number, default: 0 },
    couponCode: { type: String, default: '' },
    customerName: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    payments: { type: Array, default: [] },
    note: { type: String, default: '' }
  },
  { timestamps: true }
);

export const HeldSale = mongoose.model('HeldSale', heldSaleSchema);
