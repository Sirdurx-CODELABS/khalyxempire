import mongoose from 'mongoose';

const authTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['reset', 'invite'], required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    app: { type: String, enum: ['admin', 'erp'], default: 'admin' },
    expiresAt: { type: Date, required: true },
    usedAt: Date
  },
  { timestamps: true }
);

authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthToken = mongoose.model('AuthToken', authTokenSchema);
