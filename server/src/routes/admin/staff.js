import { Router } from 'express';
import { ROLES, ACCOUNT_TYPES, accountConfig, PERMISSIONS } from '@khalyx/shared';
import { User } from '../../models/User.js';
import { HttpError } from '../../middleware/error.js';
import { requireAdmin, publicUser } from '../../middleware/admin.js';
import { createManagedAccount } from '../../services/accounts.js';

const router = Router();
router.use(requireAdmin);

router.get('/', async (req, res) => {
  const { kind } = req.query;
  const filter = {};
  if (kind === 'store') filter.role = ROLES.CUSTOMER;
  else if (kind === 'erp') filter.role = ROLES.STAFF;
  else if (kind === 'admin') filter.role = ROLES.ADMIN;
  else filter.role = { $in: [ROLES.ADMIN, ROLES.STAFF, ROLES.CUSTOMER] };
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ users: users.map(publicUser), permissions: PERMISSIONS });
});

router.post('/', async (req, res) => {
  const user = await createManagedAccount({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    phone: req.body.phone,
    accountType: req.body.accountType || req.body.role,
    permissions: req.body.permissions
  });
  res.status(201).json({ user });
});

router.patch('/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('+password');
  if (!user) throw new HttpError(404, 'User not found');
  if (req.body.name) user.name = req.body.name;
  if (req.body.phone !== undefined) user.phone = req.body.phone;
  if (req.body.isActive !== undefined) {
    if (String(user._id) === String(req.user._id) && req.body.isActive === false) {
      throw new HttpError(400, 'You cannot deactivate yourself');
    }
    user.isActive = req.body.isActive;
  }
  if (req.body.accountType || (req.body.role && req.body.role !== user.role)) {
    if (String(user._id) === String(req.user._id)) throw new HttpError(400, 'You cannot change your own role');
    const next = accountConfig(req.body.accountType || req.body.role);
    user.role = next.role;
    user.apps = next.apps;
    if (next.role === ROLES.ADMIN) user.permissions = PERMISSIONS;
    else if (next.role === ROLES.STAFF) user.permissions = req.body.permissions || [];
    else user.permissions = [];
  } else if (req.body.permissions && user.role !== ROLES.CUSTOMER) {
    user.permissions = req.body.permissions;
  }
  if (req.body.password) user.password = req.body.password;
  await user.save();
  res.json({ user: publicUser(user) });
});

export default router;
