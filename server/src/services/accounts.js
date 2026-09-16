import { ROLES, PERMISSIONS, ACCOUNT_TYPES, accountConfig, appsFor } from '@khalyx/shared';
import { User } from '../models/User.js';
import { HttpError } from '../middleware/error.js';
import { publicUser } from '../middleware/admin.js';

export async function createManagedAccount({ name, email, password, phone, accountType, permissions }) {
  if (!name || !email || !password) throw new HttpError(400, 'Name, email and password are required');
  if (String(password).length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  const exists = await User.findOne({ email: String(email).toLowerCase() });
  if (exists) throw new HttpError(409, 'An account with that email already exists');
  const { role, apps } = accountConfig(accountType);
  const user = await User.create({
    name,
    email,
    password,
    phone: phone || '',
    role,
    apps,
    permissions: role === ROLES.ADMIN ? PERMISSIONS : Array.isArray(permissions) ? permissions : []
  });
  return publicUser(user);
}

export function accessLabel(user) {
  const apps = appsFor(user);
  if (apps.includes(ACCOUNT_TYPES.ADMIN)) return 'Admin + ERP';
  if (apps.includes(ACCOUNT_TYPES.ERP)) return 'ERP / POS';
  return 'Storefront';
}
