import mongoose from 'mongoose';
import { ORDER_CHANNELS, ORDER_STATUSES, PAYMENT_PROVIDERS } from '@khalyx/shared';

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    variantId: mongoose.Schema.Types.ObjectId,
    name: String,
    image: String,
    sku: String,
    size: String,
    color: String,
    price: Number,
    costPrice: { type: Number, default: 0 },
    qty: Number
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    guestEmail: { type: String, default: '' },
    guestName: { type: String, default: '' },
    guestPhone: { type: String, default: '' },
    channel: { type: String, enum: ORDER_CHANNELS, default: 'online' },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    payment: {
      provider: { type: String, enum: PAYMENT_PROVIDERS, required: true },
      reference: { type: String, default: '', index: true },
      status: { type: String, default: 'pending' },
      amount: { type: Number, default: 0 },
      tendered: { type: Number, default: 0 },
      change: { type: Number, default: 0 },
      raw: { type: mongoose.Schema.Types.Mixed }
    },
    payments: [
      {
        method: { type: String, enum: ['cash', 'card', 'transfer', 'account', 'paystack', 'flutterwave', 'simulate'] },
        amount: { type: Number, default: 0 },
        tendered: { type: Number, default: 0 },
        change: { type: Number, default: 0 }
      }
    ],
    refundedAmount: { type: Number, default: 0 },
    refundNote: { type: String, default: '' },
    refundedAt: Date,
    items: [orderItemSchema],
    shippingAddress: {
      fullName: String,
      phone: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      country: { type: String, default: 'Nigeria' },
      postalCode: String
    },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    bulkDiscount: { type: Number, default: 0 },
    discountBreakdown: [
      {
        type: { type: String, enum: ['bulk', 'coupon', 'manual'] },
        label: String,
        amount: { type: Number, default: 0 }
      }
    ],
    shippingFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    couponCode: { type: String, default: '' },
    whatsappLink: { type: String, default: '' },
    paidAt: Date,
    stockReserved: { type: Boolean, default: false },
    soldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    fulfillment: {
      packedAt: Date,
      packedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      packingNotes: { type: String, default: '' },
      checkedSkus: [{ type: String }]
    },
    shipping: {
      carrier: { type: String, default: '' },
      trackingNumber: { type: String, default: '' },
      trackingUrl: { type: String, default: '' },
      shippedAt: Date,
      estimatedDelivery: Date
    },
    rma: {
      status: { type: String, enum: ['', 'requested', 'approved', 'received', 'closed'], default: '' },
      reason: { type: String, default: '' },
      note: { type: String, default: '' },
      requestedAt: Date,
      resolvedAt: Date
    }
  },
  { timestamps: true }
);

export const Order = mongoose.model('Order', orderSchema);
