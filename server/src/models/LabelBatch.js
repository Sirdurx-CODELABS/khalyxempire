import mongoose from 'mongoose';

const labelItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    variantId: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String, required: true },
    sku: { type: String, default: '' },
    barcode: { type: String, required: true },
    size: { type: String, default: '' },
    color: { type: String, default: '' },
    price: { type: Number, default: 0 },
    copies: { type: Number, default: 1, min: 1 }
  },
  { _id: false }
);

const labelBatchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: { type: [labelItemSchema], default: [] }
  },
  { timestamps: true }
);

labelBatchSchema.index({ name: 1, createdAt: -1 });
labelBatchSchema.index({ 'items.sku': 1 });
labelBatchSchema.index({ 'items.barcode': 1 });

export const LabelBatch = mongoose.model('LabelBatch', labelBatchSchema);
