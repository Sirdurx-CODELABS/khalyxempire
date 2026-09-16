import mongoose from 'mongoose';

const subscriberSchema = new mongoose.Schema(
  {
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    source: { type: String, default: 'storefront' }
  },
  { timestamps: true }
);

subscriberSchema.index({ email: 1 }, { unique: true, sparse: true });

export const Subscriber = mongoose.model('Subscriber', subscriberSchema);
