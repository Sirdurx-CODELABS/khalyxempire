import { DEFAULT_POS_BULK } from '@khalyx/shared';
import { StoreSettings } from '../models/StoreSettings.js';

export function publicPosSettings(doc) {
  const bulk = doc?.posBulk || {};
  return {
    posBulk: {
      enabled: bulk.enabled !== false,
      scope: bulk.scope === 'cart' ? 'cart' : 'same_product',
      threshold: Math.max(1, Number(bulk.threshold) || DEFAULT_POS_BULK.threshold),
      percent: Math.max(0, Number(bulk.percent) || DEFAULT_POS_BULK.percent)
    }
  };
}

export async function getStoreSettings() {
  let settings = await StoreSettings.findOne({ key: 'default' });
  if (!settings) settings = await StoreSettings.create({ key: 'default', posBulk: DEFAULT_POS_BULK });
  return settings;
}
