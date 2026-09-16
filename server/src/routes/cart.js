import { Router } from 'express';
import { optionalAuth, guestIdFrom } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { addItemToCart, getCartDoc, serializeCart } from '../services/cart.js';

const router = Router();

router.use(optionalAuth);

router.get('/', async (req, res) => {
  const cart = await getCartDoc({ user: req.user, guestId: guestIdFrom(req) });
  res.json(await serializeCart(cart));
});

router.post('/items', async (req, res) => {
  const { productId, variantId, qty } = req.body;
  if (!productId || !variantId) throw new HttpError(400, 'Product and variant are required');
  const cart = await getCartDoc({ user: req.user, guestId: guestIdFrom(req) });
  await addItemToCart(cart, { productId, variantId, qty: Number(qty) || 1 });
  res.status(201).json(await serializeCart(cart));
});

router.patch('/items/:itemId', async (req, res) => {
  const cart = await getCartDoc({ user: req.user, guestId: guestIdFrom(req) });
  const item = cart.items.id(req.params.itemId);
  if (!item) throw new HttpError(404, 'Item not in cart');
  const qty = Number(req.body.qty);
  if (qty < 1) {
    item.deleteOne();
  } else {
    item.qty = qty;
  }
  await cart.save();
  res.json(await serializeCart(cart));
});

router.delete('/items/:itemId', async (req, res) => {
  const cart = await getCartDoc({ user: req.user, guestId: guestIdFrom(req) });
  const item = cart.items.id(req.params.itemId);
  if (item) item.deleteOne();
  await cart.save();
  res.json(await serializeCart(cart));
});

router.delete('/', async (req, res) => {
  const cart = await getCartDoc({ user: req.user, guestId: guestIdFrom(req) });
  cart.items = [];
  await cart.save();
  res.json(await serializeCart(cart));
});

export default router;
