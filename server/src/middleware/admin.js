import { ROLES, STAFF_DEFAULT_PERMISSIONS, appsFor, userHasApp, accessFromApps } from '@khalyx/shared';
import { protect, authorize } from './auth.js';
import { HttpError } from './error.js';

export const requireStaff = [protect, authorize(ROLES.ADMIN, ROLES.STAFF)];

function permissionsFor(user) {
  if (user.role === ROLES.ADMIN) return ['*'];
  if (Array.isArray(user.permissions)) return user.permissions;
  return STAFF_DEFAULT_PERMISSIONS;
}

export function requireApp(app) {
  return (req, _res, next) => {
    if (!userHasApp(req.user, app)) {
      throw new HttpError(
        403,
        app === 'erp'
          ? 'This account cannot use the in-store ERP. Ask an admin to enable ERP System access.'
          : 'This account cannot use the admin dashboard. Ask an admin to enable Admin Dashboard access.'
      );
    }
    next();
  };
}

export function requirePermission(permission) {
  return (req, _res, next) => {
    const perms = permissionsFor(req.user);
    if (perms.includes('*') || perms.includes(permission)) return next();
    throw new HttpError(403, `Missing ${permission} permission`);
  };
}

export function requireAdmin(req, _res, next) {
  if (req.user.role !== ROLES.ADMIN) throw new HttpError(403, 'Admin only');
  next();
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar || '',
    role: user.role,
    staffTitle: user.staffTitle || (user.role === 'admin' ? 'admin' : user.role === 'staff' ? 'sales' : ''),
    access: accessFromApps(appsFor(user)),
    apps: appsFor(user),
    permissions: user.permissions || [],
    notes: user.notes || '',
    tags: user.tags || [],
    isActive: user.isActive,
    accountBalance: user.accountBalance || 0,
    createdAt: user.createdAt
  };
}
