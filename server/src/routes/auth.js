import { Router } from 'express';
import { userHasApp, appsFor, APPS } from '@khalyx/shared';
import { User } from '../models/User.js';
import { HttpError } from '../middleware/error.js';
import { optionalAuth, protect, setAuthCookie, signToken, guestIdFrom } from '../middleware/auth.js';
import { mergeGuestCart } from '../services/cart.js';
import { auth0Enabled, beginGoogleLogin, finishGoogleLogin } from '../services/auth0.js';

const router = Router();

const APP_LABELS = {
  [APPS.STOREFRONT]: 'the online store',
  [APPS.ADMIN]: 'the admin dashboard',
  [APPS.ERP]: 'ERP / POS'
};

function userPayload(user, token) {
  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar || '',
      role: user.role,
      permissions: user.permissions || [],
      apps: appsFor(user)
    }
  };
}

router.post('/register', optionalAuth, async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) throw new HttpError(400, 'Name, email and password are required');
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw new HttpError(409, 'An account with that email already exists');
  const user = await User.create({ name, email, password, phone: phone || '', apps: [APPS.STOREFRONT] });
  const token = signToken(user);
  setAuthCookie(res, token);
  await mergeGuestCart(user, guestIdFrom(req));

  res.status(201).json(userPayload(user, token));
});

router.post('/login', async (req, res) => {
  const { email, password, app } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() }).select('+password');
  if (!user || !user.password || !(await user.matchPassword(password))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  if (!user.isActive) throw new HttpError(403, 'This account has been deactivated');
  if (app && !userHasApp(user, app)) {
    throw new HttpError(403, `This account cannot sign in to ${APP_LABELS[app] || app}`);
  }
  const token = signToken(user);
  setAuthCookie(res, token);
  await mergeGuestCart(user, guestIdFrom(req));

  res.json(userPayload(user, token));
});

router.get('/methods', (_req, res) => {
  res.json({ google: auth0Enabled() });
});

router.get('/google', beginGoogleLogin);
router.get('/auth0/callback', finishGoogleLogin);

router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', protect, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      avatar: req.user.avatar || '',
      role: req.user.role,
      permissions: req.user.permissions || [],
      apps: appsFor(req.user)
    }
  });
});

router.patch('/me', protect, async (req, res) => {
  const { name, phone } = req.body;
  if (name) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  await req.user.save();
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      avatar: req.user.avatar || '',
      role: req.user.role,
      apps: appsFor(req.user)
    }
  });
});

export default router;
