import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { HttpError } from '../middleware/error.js';

export async function getCartDoc({ user, guestId }) {
  const filter = user ? { user: user._id } : { guestId };
  if (!user && !guestId) throw new HttpError(400, 'Missing guest id');
  let cart = await Cart.findOne(filter);
  if (!cart) {
    cart = await Cart.create(filter);
  }
  return cart;
}

export async function serializeCart(cart) {
  await cart.populate({ path: 'items.product', select: 'name slug images isActive variants' });
  return {
    id: cart._id,
    items: cart.items.map((item) => ({
      id: item._id,
      productId: item.product?._id || item.product,
      slug: item.product?.slug,
      variantId: item.variantId,
      name: item.name,
      image: item.image,
      price: item.price,
      sku: item.sku,
      size: item.size,
      color: item.color,
      qty: item.qty,
      lineTotal: item.price * item.qty
    })),
    subtotal: cart.items.reduce((sum, i) => sum + i.price * i.qty, 0),
    itemCount: cart.items.reduce((sum, i) => sum + i.qty, 0)
  };
}

export async function mergeGuestCart(user, guestId) {
  if (!user || !guestId) return;
  const guestCart = await Cart.findOne({ guestId });
  if (!guestCart?.items.length) return;
  const userCart = await Cart.findOneAndUpdate({ user: user._id }, { user: user._id }, { upsert: true, new: true });
  for (const item of guestCart.items) {
    const existing = userCart.items.find((i) => String(i.variantId) === String(item.variantId));
    if (existing) existing.qty += item.qty;
    else userCart.items.push(item);
  }
  await userCart.save();
  await guestCart.deleteOne();
}

export async function addItemToCart(cart, { productId, variantId, qty = 1 }) {
  const product = await Product.findById(productId);
  if (!product || !product.isActive) throw new HttpError(404, 'Product not found');
  const variant = product.variants.id(variantId);
  if (!variant) throw new HttpError(400, 'Select a size or colour');
  if (variant.stock < qty) throw new HttpError(409, 'Not enough stock');

  const existing = cart.items.find((i) => String(i.variantId) === String(variantId));
  if (existing) {
    const nextQty = existing.qty + qty;
    if (variant.stock < nextQty) throw new HttpError(409, 'Not enough stock');
    existing.qty = nextQty;
    existing.price = variant.price;
  } else {
    cart.items.push({
      product: product._id,
      variantId: variant._id,
      qty,
      name: product.name,
      image:
        product.colorImages?.find((entry) => String(entry.color || '').toLowerCase() === String(variant.color || '').toLowerCase())
          ?.images?.[0] ||
        product.images[0] ||
        '',
      price: variant.price,
      sku: variant.sku,
      size: variant.size,
      color: variant.color
    });
  }
  await cart.save();
  return cart;
}
