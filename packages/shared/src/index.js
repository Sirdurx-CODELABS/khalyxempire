export const ROLES = {
  CUSTOMER: 'customer',
  STAFF: 'staff',
  ADMIN: 'admin'
};

export const APPS = {
  STOREFRONT: 'storefront',
  ADMIN: 'admin',
  ERP: 'erp'
};

export const ACCOUNT_TYPES = {
  STOREFRONT: 'storefront',
  ERP: 'erp',
  ADMIN: 'admin'
};

export function defaultAppsForRole(role) {
  if (role === ROLES.ADMIN) return [APPS.ADMIN, APPS.ERP];
  if (role === ROLES.STAFF) return [APPS.ERP];
  return [APPS.STOREFRONT];
}

export function appsFor(user) {
  if (user?.apps?.length) return user.apps;
  return defaultAppsForRole(user?.role);
}

export function userHasApp(user, app) {
  return appsFor(user).includes(app);
}

export function accountConfig(accountType) {
  if (accountType === ACCOUNT_TYPES.ADMIN || accountType === ROLES.ADMIN) {
    return { role: ROLES.ADMIN, apps: [APPS.ADMIN, APPS.ERP] };
  }
  if (accountType === ACCOUNT_TYPES.ERP || accountType === ROLES.STAFF) {
    return { role: ROLES.STAFF, apps: [APPS.ERP] };
  }
  return { role: ROLES.CUSTOMER, apps: [APPS.STOREFRONT] };
}

export const PERMISSIONS = [
  'dashboard',
  'products',
  'orders',
  'customers',
  'inventory',
  'coupons',
  'reports',
  'staff'
];

export const STAFF_DEFAULT_PERMISSIONS = [
  'dashboard',
  'products',
  'orders',
  'customers',
  'inventory',
  'coupons',
  'reports'
];

export const ORDER_STATUSES = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled'
];

export const PAYMENT_PROVIDERS = ['paystack', 'flutterwave', 'simulate', 'cash', 'card', 'transfer'];

export const ORDER_CHANNELS = ['online', 'pos'];

export const INVENTORY_MOVEMENT_TYPES = [
  'sale',
  'reserve',
  'release',
  'receive',
  'adjustment',
  'return'
];

export const CATEGORY_DEFS = [
  {
    slug: 'footwear',
    name: 'Footwear',
    subcategories: [
      "Men's Sneakers",
      "Men's Slides",
      "Men's Loafers",
      "Women's Heels",
      "Women's Flats",
      "Women's Sandals"
    ]
  },
  {
    slug: 'headwear',
    name: 'Headwear',
    subcategories: ['Snapback Caps', 'Fitted Caps', 'Beanies']
  },
  {
    slug: 'traditional-wear',
    name: 'Traditional / Cultural Wear',
    subcategories: ["Men's Jallabiyas", "Men's Kaftans", 'Native Caps', 'Abayas', 'Hijabs', 'Ankara']
  },
  {
    slug: 'streetwear',
    name: 'Streetwear / Lifestyle',
    subcategories: ['Graphic T-shirts', 'Hoodies', 'Joggers']
  },
  {
    slug: 'bags',
    name: 'Bags',
    subcategories: ['Handbags', 'Totes', 'Backpacks', 'Clutches']
  },
  {
    slug: 'jewelry',
    name: 'Jewelries',
    subcategories: ['Necklaces', 'Bracelets', 'Earrings', 'Rings']
  },
  {
    slug: 'fragrances',
    name: 'Fragrances',
    subcategories: ["Men's Perfumes", "Women's Perfumes"]
  },
  {
    slug: 'accessories',
    name: 'Accessories',
    subcategories: ['Wristbands', 'Belts', 'Sunglasses']
  }
];

export function formatNaira(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(value);
}

export function toKobo(naira) {
  return Math.round(Number(naira) * 100);
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function generateOrderNumber() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `KX${y}${m}${d}-${rand}`;
}

export function generatePoNumber() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `PO${y}${m}${d}-${rand}`;
}
