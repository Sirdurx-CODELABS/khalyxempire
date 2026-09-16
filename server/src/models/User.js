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
    apps: { type: [String], default: undefined },
    permissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.password || !this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = function matchPassword(plain) {
  return bcrypt.compare(plain, this.password);
};

export const User = mongoose.model('User', userSchema);
