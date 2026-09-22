import crypto from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { APPS, userHasApp } from '@khalyx/shared';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { HttpError } from '../middleware/error.js';
import { mergeGuestCart } from './cart.js';
import { signToken, setAuthCookie } from '../middleware/auth.js';

const OAUTH_COOKIE = 'auth0_oauth';
const jwksCache = new Map();

export function auth0Enabled() {
  return Boolean(env.auth0Domain && env.auth0ClientId && env.auth0ClientSecret);
}

function issuer() {
  return `https://${env.auth0Domain}/`;
}

function jwks() {
  const url = `${issuer()}.well-known/jwks.json`;
  if (!jwksCache.has(url)) jwksCache.set(url, createRemoteJWKSet(new URL(url)));
  return jwksCache.get(url);
}

export function safeNext(next) {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return '/account';
  return next;
}

function oauthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: 10 * 60 * 1000,
    path: '/'
  };
}

export function beginGoogleLogin(req, res) {
  if (!auth0Enabled()) {
    const reason = encodeURIComponent('Google sign-in is not configured yet. Add Auth0 keys in server/.env.');
    return res.redirect(`${env.clientUrl}/login?error=${reason}`);
  }
  const state = crypto.randomBytes(16).toString('hex');
  const payload = JSON.stringify({
    state,
    next: safeNext(req.query.next),
    guestId: String(req.query.guestId || '')
  });
  res.cookie(OAUTH_COOKIE, payload, oauthCookieOptions());
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.auth0ClientId,
    redirect_uri: env.auth0CallbackUrl,
    scope: 'openid profile email',
    state,
    connection: 'google-oauth2'
  });
  res.redirect(`https://${env.auth0Domain}/authorize?${params}`);
}

function readOauthCookie(req) {
  try {
    return JSON.parse(req.cookies?.[OAUTH_COOKIE] || '{}');
  } catch {
    return {};
  }
}

export async function finishGoogleLogin(req, res) {
  const { error, error_description: description, code, state } = req.query;
  const stored = readOauthCookie(req);
  res.clearCookie(OAUTH_COOKIE, { path: '/' });

  if (error) {
    const reason = encodeURIComponent(description || error);
    return res.redirect(`${env.clientUrl}/login?error=${reason}`);
  }
  if (!auth0Enabled()) {
    return res.redirect(`${env.clientUrl}/login?error=${encodeURIComponent('Google sign-in is not configured')}`);
  }
  if (!code || !state || state !== stored.state) {
    const reason = !stored.state
      ? 'Google sign-in session expired. Use Continue with Google again (do not bookmark the Auth0 page).'
      : 'Google sign-in was cancelled or the state cookie was lost.';
    return res.redirect(`${env.clientUrl}/login?error=${encodeURIComponent(reason)}`);
  }

  try {
    const tokenRes = await fetch(`https://${env.auth0Domain}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: env.auth0ClientId,
        client_secret: env.auth0ClientSecret,
        code,
        redirect_uri: env.auth0CallbackUrl
      })
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.id_token) {
      throw new HttpError(401, tokens.error_description || 'Could not complete Google sign-in');
    }

    const { payload } = await jwtVerify(tokens.id_token, jwks(), {
      issuer: issuer(),
      audience: env.auth0ClientId
    });

    const email = String(payload.email || '').toLowerCase();
    const sub = String(payload.sub || '');
    if (!email || !sub) throw new HttpError(401, 'Google did not return an email');

    let user = (await User.findOne({ auth0Sub: sub })) || (await User.findOne({ email }));
    if (user) {
      if (!user.isActive) throw new HttpError(403, 'This account has been deactivated');
      if (!userHasApp(user, APPS.STOREFRONT) && user.role !== 'customer') {
        throw new HttpError(403, 'This account cannot sign in to the online store');
      }
      user.auth0Sub = user.auth0Sub || sub;
      user.authProvider = user.authProvider || 'auth0';
      if (payload.picture && !user.avatar) user.avatar = payload.picture;
      if (payload.name && user.name === user.email) user.name = payload.name;
      await user.save();
    } else {
      user = await User.create({
        name: payload.name || email.split('@')[0],
        email,
        authProvider: 'auth0',
        auth0Sub: sub,
        avatar: payload.picture || '',
        apps: [APPS.STOREFRONT]
      });
    }

    await mergeGuestCart(user, stored.guestId);
    const token = signToken(user);
    setAuthCookie(res, token);
    const next = encodeURIComponent(safeNext(stored.next));
    res.redirect(`${env.clientUrl.replace(/\/$/, '')}/auth/callback#token=${encodeURIComponent(token)}&next=${next}`);
  } catch (err) {
    const reason = encodeURIComponent(err.message || 'Google sign-in failed');
    res.redirect(`${env.clientUrl}/login?error=${reason}`);
  }
}
