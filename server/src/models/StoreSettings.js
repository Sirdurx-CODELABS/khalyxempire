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
    }
  },
  { timestamps: true }
);

export const StoreSettings = mongoose.model('StoreSettings', storeSettingsSchema);
