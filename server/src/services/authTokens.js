import crypto from 'node:crypto';
import { AuthToken } from '../models/AuthToken.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { sendMail } from './email.js';
import { APPS, userHasApp } from '@khalyx/shared';
import { HttpError } from '../middleware/error.js';

const HOUR = 60 * 60 * 1000;

export function portalBase(app) {
  const origin = String(app === APPS.ADMIN ? env.adminUrl : env.erpUrl).replace(/\/$/, '');
  const path = app === APPS.ADMIN ? '/admin' : '/erp';
  return origin.endsWith(path) ? origin : `${origin}${path}`;
}

export function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

export function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function randomPassword() {
  return `${crypto.randomBytes(18).toString('base64url')}Aa1!`;
}

export async function issueAuthToken(user, type, app, hours) {
  const raw = randomToken();
  await AuthToken.deleteMany({ user: user._id, type, usedAt: { $exists: false } });
  await AuthToken.create({
    user: user._id,
    type,
    app: app === APPS.ERP ? APPS.ERP : APPS.ADMIN,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + hours * HOUR)
  });
  return raw;
}

export async function findAuthToken(raw, type) {
  if (!raw) return null;
  const token = await AuthToken.findOne({
    tokenHash: hashToken(raw),
    type,
    usedAt: { $exists: false }
  }).populate('user');
  if (!token || !token.user || token.expiresAt < new Date()) return null;
  return token;
}

export async function consumeAuthToken(raw, type) {
  const token = await findAuthToken(raw, type);
  if (!token) return null;
  token.usedAt = new Date();
  await token.save();
  return token;
}

export async function requestPasswordReset(email, app = APPS.ADMIN) {
  const ok = { ok: true, message: 'If that email is on file, we sent a reset link.' };
  const user = await User.findOne({ email: String(email || '').toLowerCase().trim() });
  if (!user || !user.isActive) return ok;
  if (app && !userHasApp(user, app)) return ok;
  const raw = await issueAuthToken(user, 'reset', app, 1);
  const link = `${portalBase(app)}/reset-password?token=${raw}`;
  await sendMail({
    to: user.email,
    subject: 'Reset your Khalyx Empire password',
    text: `Hi ${user.name || ''},

Use this link to choose a new password. It expires in 1 hour.

${link}

If you did not ask for this, you can ignore the email.

— Khalyx Empire`
  });
  return env.nodeEnv === 'production' ? ok : { ...ok, devLink: link };
}

export async function resetPassword(rawToken, password) {
  if (!password || String(password).length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  const token = await consumeAuthToken(rawToken, 'reset');
  if (!token?.user) throw new HttpError(400, 'This reset link is invalid or has expired');
  token.user.password = password;
  await token.user.save();
  return { ok: true };
}

export function preferredInviteApp(user, requested) {
  if (requested === APPS.ERP || requested === APPS.ADMIN) {
    if (userHasApp(user, requested)) return requested;
  }
  if (userHasApp(user, APPS.ADMIN)) return APPS.ADMIN;
  return APPS.ERP;
}

export async function sendStaffInvite(user, app) {
  const preferred = preferredInviteApp(user, app);
  const raw = await issueAuthToken(user, 'invite', preferred, 24 * 7);
  const link = `${portalBase(preferred)}/invite?token=${raw}`;
  await sendMail({
    to: user.email,
    subject: 'You are invited to Khalyx Empire',
    text: `Hi ${user.name || ''},

You have been invited to Khalyx Empire (${preferred === APPS.ADMIN ? 'Admin Portal' : 'ERP — In-Store System'}).
Set your password with this link. It expires in 7 days.

${link}

From the Ground, To the Throne.
— Khalyx Empire`
  });
  return { inviteUrl: link, app: preferred };
}

export function publicInvite(token) {
  const user = token.user;
  return {
    name: user.name,
    email: user.email,
    staffTitle: user.staffTitle || '',
    app: token.app,
    apps: user.apps || []
  };
}
