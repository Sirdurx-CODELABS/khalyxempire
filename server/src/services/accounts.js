import { ROLES, PERMISSIONS, STAFF_TITLES, accountConfig, permissionsForTitle, accessFromApps, appsFor } from '@khalyx/shared';
import { User } from '../models/User.js';
import { HttpError } from '../middleware/error.js';
import { publicUser } from '../middleware/admin.js';
import { applyDefaultSchedule } from './hr.js';

export async function createManagedAccount({
  name,
  email,
  password,
  phone,
  accountType,
  access,
  permissions,
  pin,
  staffTitle,
  notes,
  tags,
  avatar,
  invite = false
}) {
  if (!name || !email) throw new HttpError(400, 'Name and email are required');
  if (!invite && !password) throw new HttpError(400, 'Name, email and password are required');
  if (!invite && String(password).length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  const exists = await User.findOne({ email: String(email).toLowerCase() });
  if (exists) throw new HttpError(409, 'An account with that email already exists');
  const title = STAFF_TITLES.includes(staffTitle) ? staffTitle : accountType === 'admin' ? 'admin' : 'sales';
  const { role, apps } = accountConfig(title === 'admin' ? 'admin' : accountType || 'erp', access);
  const { randomPassword, sendStaffInvite } = await import('./authTokens.js');
  const user = await User.create({
    name,
    email,
    password: invite ? randomPassword() : password,
    phone: phone || '',
    avatar: avatar || '',
    pin: pin || undefined,
    staffTitle: title,
    notes: notes || '',
    tags: tags || [],
    role,
    apps,
    permissions: role === ROLES.ADMIN ? PERMISSIONS : Array.isArray(permissions) ? permissions : permissionsForTitle(title)
  });
  await applyDefaultSchedule(user._id);
  const publicAccount = publicUser(user);
  if (!invite) return publicAccount;
  const inviteApp = access === 'erp' ? 'erp' : 'admin';
  const sent = await sendStaffInvite(user, inviteApp);
  return { ...publicAccount, inviteUrl: sent.inviteUrl, inviteApp: sent.app };
}

export function accessLabel(user) {
  const access = accessFromApps(appsFor(user));
  if (access === 'both') return 'Admin + ERP';
  if (access === 'admin') return 'Admin dashboard';
  if (access === 'erp') return 'ERP / POS';
  return 'None';
}
