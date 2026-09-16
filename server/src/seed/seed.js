import { CATEGORY_DEFS, slugify, ROLES, PERMISSIONS } from '@khalyx/shared';
import { connectDb, disconnectDb } from '../config/db.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { Supplier } from '../models/Supplier.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { Cart } from '../models/Cart.js';
import { Wishlist } from '../models/Wishlist.js';
import { Review } from '../models/Review.js';
import { InventoryMovement } from '../models/InventoryMovement.js';
import { LabelBatch } from '../models/LabelBatch.js';
import { PRODUCTS } from './data.js';

function categoryDocs() {
  return CATEGORY_DEFS.map((c, i) => ({
    name: c.name,
    slug: c.slug,
    subcategories: c.subcategories,
    description: `${c.name} from Khalyx Empire`,
    image: '',
    sortOrder: i
  }));
}

const DEMO_USERS = [
  {
    name: 'Khalyx Admin',
    email: 'admin@khalyx.ng',
    password: 'KhalyxAdmin!23',
    role: ROLES.ADMIN,
    apps: ['admin', 'erp'],
    phone: '08000000001',
    permissions: PERMISSIONS
  },
  {
    name: 'Store Staff',
    email: 'staff@khalyx.ng',
    password: 'KhalyxStaff!23',
    role: ROLES.STAFF,
    apps: ['erp'],
    phone: '08000000002',
    permissions: []
  },
  {
    name: 'Ada Okonkwo',
    email: 'ada@khalyx.ng',
    password: 'ShopKhalyx!23',
    role: ROLES.CUSTOMER,
    apps: ['storefront'],
    phone: '08000000003'
  }
];

function skuFor(name, variant, index) {
  const prefix = slugify(name).replace(/-/g, '').slice(0, 8).toUpperCase();
  const size = slugify(variant.size || 'os').replace(/-/g, '').toUpperCase() || 'OS';
  const color = slugify(variant.color || 'na').replace(/-/g, '').slice(0, 6).toUpperCase() || 'NA';
  return `KX-${prefix}-${size}-${color}-${index + 1}`;
}

function barcodeFor(sku) {
  let hash = 0;
  for (const ch of sku) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `890${String(hash).padStart(9, '0').slice(-9)}`;
}

export async function syncCategories() {
  const docs = categoryDocs();
  const slugs = docs.map((d) => d.slug);
  for (const doc of docs) {
    await Category.findOneAndUpdate({ slug: doc.slug }, { $set: doc }, { upsert: true, new: true });
  }
  await Category.deleteMany({ slug: { $nin: slugs } });
  return Category.find({ slug: { $in: slugs } }).sort({ sortOrder: 1 });
}

export async function ensureShopStructure() {
  await syncCategories();
  for (const u of DEMO_USERS) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) await User.create(u);
  }
}

export async function seedAll({ reset = true } = {}) {
  if (reset) {
    await Promise.all([
      Product.deleteMany({}),
      Review.deleteMany({}),
      Cart.deleteMany({}),
      Wishlist.deleteMany({}),
      InventoryMovement.deleteMany({}),
      LabelBatch.deleteMany({}),
      Supplier.deleteMany({}),
      PurchaseOrder.deleteMany({})
    ]);
  }

  const categories = await syncCategories();
  const bySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));

  const docs = PRODUCTS.map((p) => {
    const cat = bySlug[p.category];
    if (!cat) throw new Error(`Unknown category slug in seed: ${p.category}`);
    return {
      name: p.name,
      slug: slugify(p.name),
      description: p.description,
      seoTitle: `${p.name} | Khalyx Empire`,
      seoDescription: p.description.slice(0, 155),
      category: cat._id,
      subcategory: p.subcategory,
      images: p.images || [],
      colorImages: p.colorImages || [],
      tags: p.tags,
      featured: Boolean(p.featured),
      newArrival: Boolean(p.newArrival),
      isActive: true,
      variants: p.variants.map((v, i) => {
        const sku = v.sku || skuFor(p.name, v, i);
        return {
          sku,
          size: v.size,
          color: v.color,
          price: v.price,
          compareAtPrice: v.compareAtPrice || 0,
          stock: v.stock,
          reserved: 0,
          lowStockThreshold: 5,
          barcode: v.barcode || barcodeFor(sku)
        };
      })
    };
  });

  if (!reset) {
    await Product.deleteMany({ slug: { $in: docs.map((d) => d.slug) } });
  }
  await Product.insertMany(docs);

  for (const u of DEMO_USERS) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) await User.create(u);
  }

  const count = await Product.countDocuments();
  console.log(`[seed] ${categories.length} categories, ${count} products written. Edit server/src/seed/data.js and run npm run seed, or change items in admin.`);
}

const isMain = process.argv[1]?.includes('seed.js');
if (isMain) {
  connectDb()
    .then(() => seedAll())
    .then(() => disconnectDb())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
