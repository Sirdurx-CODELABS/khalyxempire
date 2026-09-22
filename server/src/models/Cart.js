import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    qty: { type: Number, required: true, min: 1 },
    name: String,
    image: String,
    price: Number,
    sku: String,
    size: String,
    color: String
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    // unique+sparse only here — do not also call schema.index() on these paths
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
    guestId: { type: String, unique: true, sparse: true },
    items: { type: [cartItemSchema], default: [] }
  },
  { timestamps: true }
);

export const Cart = mongoose.model('Cart', cartSchema);
