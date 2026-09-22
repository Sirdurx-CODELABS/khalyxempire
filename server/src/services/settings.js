import { DEFAULT_POS_BULK } from '@khalyx/shared';
import { StoreSettings } from '../models/StoreSettings.js';
import { env } from '../config/env.js';

const DEFAULT_STORE = {
  storeName: 'Khalyx Empire',
  tagline: 'From the Ground, To the Throne',
  supportEmail: 'orders@khalyx.ng',
  supportPhone: '',
  address: '',
  currency: 'NGN',
  shippingFee: env.shippingFee,
  freeShippingThreshold: env.freeShippingThreshold,
  whatsappNumber: env.whatsappNumber,
  whatsappGroup: env.whatsappGroup,
  taxNote: ''
};

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

export function publicStoreProfile(doc) {
  const store = doc?.store || {};
  return {
    store: {
      storeName: store.storeName || DEFAULT_STORE.storeName,
      tagline: store.tagline ?? DEFAULT_STORE.tagline,
      supportEmail: store.supportEmail || DEFAULT_STORE.supportEmail,
      supportPhone: store.supportPhone || DEFAULT_STORE.supportPhone,
      address: store.address || DEFAULT_STORE.address,
      currency: store.currency || DEFAULT_STORE.currency,
      shippingFee: Number.isFinite(Number(store.shippingFee)) ? Number(store.shippingFee) : env.shippingFee,
      freeShippingThreshold: Number.isFinite(Number(store.freeShippingThreshold))
        ? Number(store.freeShippingThreshold)
        : env.freeShippingThreshold,
      whatsappNumber: store.whatsappNumber || env.whatsappNumber,
      whatsappGroup: store.whatsappGroup || env.whatsappGroup,
      taxNote: store.taxNote || ''
    }
  };
}

export function publicSettings(doc) {
  return { ...publicPosSettings(doc), ...publicStoreProfile(doc) };
}

export async function getStoreSettings() {
  let settings = await StoreSettings.findOne({ key: 'default' });
  if (!settings) {
    settings = await StoreSettings.create({
      key: 'default',
      posBulk: DEFAULT_POS_BULK,
      store: DEFAULT_STORE
    });
  }
  return settings;
}
