import { Router } from 'express';
import { userHasApp, appsFor, accessFromApps, APPS, ROLES } from '@khalyx/shared';
import { User } from '../models/User.js';
import { HttpError } from '../middleware/error.js';
import { optionalAuth, protect, setAuthCookie, signToken, guestIdFrom } from '../middleware/auth.js';
import { mergeGuestCart } from '../services/cart.js';
import { auth0Enabled, beginGoogleLogin, finishGoogleLogin } from '../services/auth0.js';
import { env } from '../config/env.js';
import { Product } from '../models/Product.js';
import {
  findAuthToken,
  consumeAuthToken,
  requestPasswordReset,
  resetPassword,
  publicInvite
} from '../services/authTokens.js';

const router = Router();

const APP_LABELS = {
  [APPS.STOREFRONT]: 'the online store',
  [APPS.ADMIN]: 'the admin dashboard',
  [APPS.ERP]: 'ERP / POS'
};

function userPayload(user, token) {
  return {
    token,
    user: publicUser(user)
  };
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar || '',
    role: user.role,
    staffTitle: user.staffTitle || '',
    permissions: user.permissions || [],
    apps: appsFor(user),
    access: accessFromApps(appsFor(user)),
    authProvider: user.authProvider || 'local',
    hasPassword: Boolean(user.password)
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
  const { email, password, pin, app } = req.body;
  let user;
  if (pin && !password) {
    if (app && app !== APPS.ERP) {
      throw new HttpError(403, 'PIN sign-in is only available on the in-store ERP');
    }
    const staff = await User.find({
      role: { $in: [ROLES.ADMIN, ROLES.STAFF] },
      isActive: true,
      pin: { $ne: '' }
    }).select('+pin +password name email phone avatar role staffTitle permissions apps');
    for (const candidate of staff) {
      if (await candidate.matchPin(pin)) {
        user = candidate;
        break;
      }
    }
    if (!user) throw new HttpError(401, 'Invalid PIN');
  } else {
    user = await User.findOne({ email: email?.toLowerCase() }).select('+password');
    if (!user || !user.password || !(await user.matchPassword(password))) {
      throw new HttpError(401, 'Invalid email or password');
    }
  }
  if (!user.isActive) throw new HttpError(403, 'This account has been deactivated');
  if (app && !userHasApp(user, app)) {
    const denied =
      app === APPS.ERP
        ? 'This account cannot sign in to the in-store ERP. Ask an admin to enable ERP System access.'
        : app === APPS.ADMIN
          ? 'This account cannot sign in to the admin dashboard. Ask an admin to enable Admin Dashboard access.'
          : `This account cannot sign in to ${APP_LABELS[app] || app}`;
    throw new HttpError(403, denied);
  }
  const token = signToken(user);
  setAuthCookie(res, token);
  await mergeGuestCart(user, guestIdFrom(req));

  res.json(userPayload(user, token));
});

router.get('/methods', (_req, res) => {
  const google = auth0Enabled();
  const callbackUrl = env.auth0CallbackUrl;
  const clientUrl = env.clientUrl.replace(/\/$/, '');
  const apiPublicUrl = env.apiPublicUrl.replace(/\/$/, '');
  res.json({
    google,
    callbackUrl,
    clientUrl,
    apiPublicUrl,
    domain: env.auth0Domain || '',
    authorizeUrl: google ? `${apiPublicUrl}/api/auth/google` : '',
    auth0Dashboard: {
      allowedCallbackUrls: [callbackUrl],
      allowedLogoutUrls: [clientUrl, `${clientUrl}/`],
      allowedWebOrigins: [clientUrl],
      applicationLoginUri: `${clientUrl}/login`
    },
    hint: google
      ? `In Auth0 → Applications → Settings, Allowed Callback URLs must include exactly: ${callbackUrl}`
      : 'Add AUTH0_DOMAIN, AUTH0_CLIENT_ID, and AUTH0_CLIENT_SECRET to server/.env, set AUTH0_CALLBACK_URL to your API /api/auth/auth0/callback, enable Google, then restart the API.'
  });
});

router.get('/google', beginGoogleLogin);
router.get('/auth0/callback', finishGoogleLogin);

router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  res.json({ user: publicUser(user || req.user) });
});

router.patch('/me', protect, async (req, res) => {
  const { name, phone, avatar, password, currentPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw new HttpError(404, 'Account not found');

  if (name !== undefined) {
    const trimmed = String(name || '').trim();
    if (!trimmed) throw new HttpError(400, 'Name is required');
    user.name = trimmed;
  }
  if (phone !== undefined) user.phone = String(phone || '').trim();
  if (avatar !== undefined) user.avatar = String(avatar || '').trim();

  if (password) {
    if (String(password).length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
    if (user.password) {
      if (!currentPassword || !(await user.matchPassword(currentPassword))) {
        throw new HttpError(401, 'Current password is incorrect');
      }
    }
    user.password = password;
    if (user.authProvider === 'auth0') user.authProvider = user.authProvider || 'auth0';
  }

  await user.save();
  res.json({ user: publicUser(user) });
});

router.get('/showcase', async (_req, res) => {
  const products = await Product.find({ isActive: true, 'images.0': { $exists: true, $ne: '' } })
    .select('name images tags subcategory')
    .sort({ featured: -1, createdAt: -1 })
    .limit(8);
  res.json({
    slides: products.map((p) => ({
      src: p.images[0],
      caption: p.name,
      kicker: p.subcategory || p.tags?.[0] || 'Khalyx Empire'
    }))
  });
});

router.post('/forgot-password', async (req, res) => {
  const app = req.body.app === APPS.ERP ? APPS.ERP : APPS.ADMIN;
  res.json(await requestPasswordReset(req.body.email, app));
});

router.get('/reset-password/:token', async (req, res) => {
  const token = await findAuthToken(req.params.token, 'reset');
  if (!token) throw new HttpError(400, 'This reset link is invalid or has expired');
  res.json({ ok: true, email: token.user.email });
});

router.post('/reset-password', async (req, res) => {
  res.json(await resetPassword(req.body.token, req.body.password));
});

router.get('/invite/:token', async (req, res) => {
  const token = await findAuthToken(req.params.token, 'invite');
  if (!token) throw new HttpError(400, 'This invite is invalid or has expired');
  res.json({ invite: publicInvite(token) });
});

router.post('/invite/accept', async (req, res) => {
  const { token: raw, password, pin, name } = req.body;
  if (!password || String(password).length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  const token = await consumeAuthToken(raw, 'invite');
  if (!token?.user) throw new HttpError(400, 'This invite is invalid or has expired');
  const user = token.user;
  if (!user.isActive) throw new HttpError(403, 'This account has been deactivated');
  user.password = password;
  if (name) user.name = name;
  if (pin) user.pin = pin;
  await user.save();
  const jwt = signToken(user);
  setAuthCookie(res, jwt);
  res.json(userPayload(user, jwt));
});

export default router;
