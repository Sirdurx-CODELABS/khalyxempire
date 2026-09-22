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

export const ACCESS_MODES = {
  ADMIN: 'admin',
  ERP: 'erp',
  BOTH: 'both'
};

export function appsFromAccess(access) {
  if (access === ACCESS_MODES.ADMIN) return [APPS.ADMIN];
  if (access === ACCESS_MODES.ERP) return [APPS.ERP];
  if (access === ACCESS_MODES.BOTH) return [APPS.ADMIN, APPS.ERP];
  return null;
}

export function accessFromApps(apps = []) {
  const hasAdmin = apps.includes(APPS.ADMIN);
  const hasErp = apps.includes(APPS.ERP);
  if (hasAdmin && hasErp) return ACCESS_MODES.BOTH;
  if (hasAdmin) return ACCESS_MODES.ADMIN;
  if (hasErp) return ACCESS_MODES.ERP;
  return '';
}

export function accountConfig(accountType, access) {
  const fromAccess = appsFromAccess(access);
  if (fromAccess) {
    const wantsAdmin =
      accountType === ACCOUNT_TYPES.ADMIN || accountType === ROLES.ADMIN || accountType === 'admin';
    return {
      role: wantsAdmin && fromAccess.includes(APPS.ADMIN) ? ROLES.ADMIN : ROLES.STAFF,
      apps: fromAccess
    };
  }
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

export const PAYMENT_PROVIDERS = ['paystack', 'flutterwave', 'simulate', 'cash', 'card', 'transfer', 'account'];

export const ORDER_CHANNELS = ['online', 'pos'];

export const SHIPPING_CARRIERS = ['GIG Logistics', 'DHL', 'FedEx', 'NIPOST', 'Kwik', 'Other'];

export const STAFF_TITLES = ['admin', 'manager', 'sales', 'cashier'];

export const WEEKDAYS = [
  { id: 'sun', label: 'Sun', day: 0 },
  { id: 'mon', label: 'Mon', day: 1 },
  { id: 'tue', label: 'Tue', day: 2 },
  { id: 'wed', label: 'Wed', day: 3 },
  { id: 'thu', label: 'Thu', day: 4 },
  { id: 'fri', label: 'Fri', day: 5 },
  { id: 'sat', label: 'Sat', day: 6 }
];

export const PERMISSIONS_BY_TITLE = {
  admin: PERMISSIONS,
  manager: ['dashboard', 'products', 'orders', 'customers', 'inventory', 'staff'],
  sales: ['orders'],
  cashier: ['orders']
};

export function permissionsForTitle(title) {
  return [...(PERMISSIONS_BY_TITLE[title] || PERMISSIONS_BY_TITLE.sales)];
}

export const PO_STATUSES = ['draft', 'sent', 'partial', 'received', 'closed', 'cancelled'];

export const LABEL_SIZES = [
  { id: '50x25', label: '50 × 25 mm', width: '50mm', height: '25mm' },
  { id: '50x30', label: '50 × 30 mm', width: '50mm', height: '30mm' },
  { id: '58x40', label: '58 × 40 mm', width: '58mm', height: '40mm' },
  { id: '80x50', label: '80 × 50 mm', width: '80mm', height: '50mm' }
];

export const PRODUCT_STATUSES = ['active', 'draft', 'out_of_stock'];

export const SUPPLIER_CATEGORIES = ['footwear', 'headwear', 'traditional-wear', 'streetwear', 'bags', 'jewelry', 'fragrances', 'accessories', 'other'];

export const SUPPLIER_STATUSES = ['pending', 'approved', 'declined'];

export const SUPPLY_REQUEST_STATUSES = ['pending', 'in_progress', 'fulfilled'];

export const INVENTORY_MOVEMENT_TYPES = [
  'sale',
  'reserve',
  'release',
  'receive',
  'adjustment',
  'return'
];

export const STOCK_ADJUST_REASONS = [
  { id: 'received', label: 'Received Stock', type: 'receive', direction: 'add' },
  { id: 'damaged', label: 'Damaged', type: 'adjustment', direction: 'remove' },
  { id: 'return', label: 'Return', type: 'return', direction: 'add' },
  { id: 'correction', label: 'Correction', type: 'adjustment', direction: 'either' }
];

export const STOCK_STATUSES = [
  { id: 'in_stock', label: 'In Stock' },
  { id: 'low_stock', label: 'Low Stock' },
  { id: 'out_of_stock', label: 'Out of Stock' }
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

export const DEFAULT_POS_BULK = {
  enabled: true,
  scope: 'same_product',
  threshold: 3,
  percent: 5
};

export function computeBulkDiscount(items = [], settings = {}) {
  const enabled = settings.enabled !== false;
  const scope = settings.scope === 'cart' ? 'cart' : 'same_product';
  const threshold = Math.max(1, Number(settings.threshold) || DEFAULT_POS_BULK.threshold);
  const percent = Math.max(0, Number(settings.percent) || 0);
  if (!enabled || !items.length || percent <= 0) {
    return { amount: 0, percent, threshold, scope, enabled, lines: [] };
  }

  const lineKey = (item) => String(item.variantId || item.sku || item.name);
  const productKey = (item) => String(item.productId || item.product || item.sku);
  const lines = [];

  const qualify = (item) => {
    const lineTotal = (Number(item.price) || 0) * (Number(item.qty) || 0);
    const amount = Math.round((lineTotal * percent) / 100);
    lines.push({
      key: lineKey(item),
      productId: String(item.productId || item.product || ''),
      variantId: String(item.variantId || ''),
      amount
    });
    return amount;
  };

  let amount = 0;
  if (scope === 'cart') {
    const units = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    if (units >= threshold) amount = items.reduce((sum, item) => sum + qualify(item), 0);
  } else {
    const groups = new Map();
    for (const item of items) {
      const key = productKey(item);
      const group = groups.get(key) || { qty: 0, items: [] };
      group.qty += Number(item.qty) || 0;
      group.items.push(item);
      groups.set(key, group);
    }
    for (const group of groups.values()) {
      if (group.qty >= threshold) amount += group.items.reduce((sum, item) => sum + qualify(item), 0);
    }
  }

  return { amount, percent, threshold, scope, enabled, lines };
}
