import mongoose from 'mongoose';
import { DEFAULT_POS_BULK } from '@khalyx/shared';

const storeSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'default' },
    posBulk: {
      enabled: { type: Boolean, default: DEFAULT_POS_BULK.enabled },
      scope: { type: String, enum: ['same_product', 'cart'], default: DEFAULT_POS_BULK.scope },
      threshold: { type: Number, default: DEFAULT_POS_BULK.threshold },
      percent: { type: Number, default: DEFAULT_POS_BULK.percent }
    },
    store: {
      storeName: { type: String, default: 'Khalyx Empire' },
      tagline: { type: String, default: 'From the Ground, To the Throne' },
      supportEmail: { type: String, default: '' },
      supportPhone: { type: String, default: '' },
      address: { type: String, default: '' },
      currency: { type: String, default: 'NGN' },
      shippingFee: { type: Number, default: 2500 },
      freeShippingThreshold: { type: Number, default: 150000 },
      whatsappNumber: { type: String, default: '' },
      whatsappGroup: { type: String, default: '' },
      taxNote: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

export const StoreSettings = mongoose.model('StoreSettings', storeSettingsSchema);
