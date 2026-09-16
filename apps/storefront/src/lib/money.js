export function money(n) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(Number(n) || 0);
}

export function firstPrice(product) {
  return product?.variants?.[0]?.price || 0;
}

export function comparePrice(product) {
  return product?.variants?.[0]?.compareAtPrice || 0;
}

export function firstInStockVariant(product) {
  return product?.variants?.find((v) => v.stock > 0) || product?.variants?.[0];
}

export function productCover(product, color) {
  const key = String(color || '').toLowerCase();
  if (key) {
    const shot = product?.colorImages?.find((entry) => String(entry.color || '').toLowerCase() === key)?.images?.[0];
    if (shot) return shot;
  }
  if (product?.images?.[0]) return product.images[0];
  return product?.colorImages?.find((entry) => entry.images?.length)?.images?.[0] || '';
}
