import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '@khalyx/shared';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, minlength: 8, select: false, required: function requiredPassword() {
      return this.authProvider !== 'auth0';
    } },
    authProvider: { type: String, enum: ['local', 'auth0'], default: 'local' },
    auth0Sub: { type: String, unique: true, sparse: true },
    avatar: { type: String, default: '' },
    phone: { type: String, default: '' },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.CUSTOMER },
    staffTitle: { type: String, enum: ['admin', 'manager', 'sales', 'cashier', ''], default: '' },
    pin: { type: String, select: false, default: '' },
    notes: { type: String, default: '' },
    tags: [{ type: String }],
    apps: { type: [String], default: undefined },
    permissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    accountBalance: { type: Number, default: 0 }
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashSecrets(next) {
  if (this.password && this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  if (this.pin && this.isModified('pin') && this.pin.length <= 8) {
    this.pin = await bcrypt.hash(this.pin, 10);
  }
  next();
});

userSchema.methods.matchPassword = function matchPassword(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.matchPin = function matchPin(plain) {
  if (!this.pin) return Promise.resolve(false);
  return bcrypt.compare(String(plain), this.pin);
};

export const User = mongoose.model('User', userSchema);
