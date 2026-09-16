import { Product } from '../models/Product.js';

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function catalogFilter(q, { activeOnly = true } = {}) {
  const filter = activeOnly ? { isActive: true } : {};
  const term = String(q || '').trim();
  if (!term) return filter;
  const rx = new RegExp(escapeRegex(term), 'i');
  filter.$or = [
    { name: rx },
    { slug: rx },
    { description: rx },
    { subcategory: rx },
    { tags: rx },
    { 'variants.sku': rx },
    { 'variants.barcode': rx },
    { 'variants.size': rx },
    { 'variants.color': rx }
  ];
  return filter;
}

export function toVariantHit(product, variant) {
  const colorKey = String(variant.color || '').toLowerCase();
  const colorShot = product.colorImages?.find((entry) => String(entry.color || '').toLowerCase() === colorKey)?.images?.[0];
  return {
    productId: product._id,
    variantId: variant._id,
    name: product.name,
    slug: product.slug,
    image: colorShot || product.images?.[0] || '',
    sku: variant.sku,
    barcode: variant.barcode,
    size: variant.size,
    color: variant.color,
    price: variant.price,
    stock: variant.stock,
    category: product.category?.name || product.category
  };
}

export async function searchProducts(q, { activeOnly = true, limit = 24, page = 1, extra = {} } = {}) {
  const filter = { ...catalogFilter(q, { activeOnly }), ...extra };
  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Product.countDocuments(filter)
  ]);
  return { products, total, filter };
}

export async function searchVariants(q, { limit = 40 } = {}) {
  const term = String(q || '').trim();
  const { products } = await searchProducts(term, { activeOnly: true, limit: term ? 24 : 40, page: 1 });
  const needle = term.toLowerCase();
  const hits = [];
  for (const product of products) {
    for (const variant of product.variants || []) {
      hits.push(toVariantHit(product, variant));
    }
  }
  if (term) {
    hits.sort((a, b) => {
      const score = (hit) => {
        if (String(hit.barcode).toLowerCase() === needle || String(hit.sku).toLowerCase() === needle) return 2;
        if (String(hit.sku).toLowerCase().includes(needle) || String(hit.barcode).toLowerCase().includes(needle)) return 1;
        return 0;
      };
      return score(b) - score(a);
    });
  }
  return hits.slice(0, limit);
}
