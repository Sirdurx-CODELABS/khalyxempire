import mongoose from 'mongoose';

const poItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    variantId: mongoose.Schema.Types.ObjectId,
    sku: String,
    name: String,
    qtyOrdered: Number,
    qtyReceived: { type: Number, default: 0 },
    unitCost: Number
  },
  { _id: true }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'ordered', 'partial', 'received', 'closed', 'cancelled'],
      default: 'draft'
    },
    items: [poItemSchema],
    invoiceRef: { type: String, default: '' },
    expectedAt: Date,
    notes: { type: String, default: '' },
    history: [
      {
        status: String,
        at: { type: Date, default: Date.now },
        note: { type: String, default: '' }
      }
    ]
  },
  { timestamps: true }
);

export const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
