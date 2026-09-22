import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:5174',
  erpUrl: process.env.ERP_URL || 'http://localhost:5175',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mongoUri: process.env.MONGODB_URI || '',
  paystackSecret: process.env.PAYSTACK_SECRET_KEY || '',
  paystackPublic: process.env.PAYSTACK_PUBLIC_KEY || '',
  flutterwaveSecret: process.env.FLUTTERWAVE_SECRET_KEY || '',
  flutterwavePublic: process.env.FLUTTERWAVE_PUBLIC_KEY || '',
  flutterwaveHash: process.env.FLUTTERWAVE_WEBHOOK_HASH || '',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'Khalyx Empire <orders@khalyx.ng>',
  whatsappNumber: process.env.WHATSAPP_BUSINESS_NUMBER || '2348000000000',
  whatsappGroup: process.env.WHATSAPP_GROUP_URL || 'https://chat.whatsapp.com/FcNOmy0VdI6ISNDi1stgSx',
  shippingFee: Number(process.env.FLAT_SHIPPING_FEE) || 2500,
  freeShippingThreshold: Number(process.env.FREE_SHIPPING_THRESHOLD) || 150000,
  auth0Domain: (process.env.AUTH0_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/$/, ''),
  auth0ClientId: process.env.AUTH0_CLIENT_ID || '',
  auth0ClientSecret: process.env.AUTH0_CLIENT_SECRET || '',
  // Callback MUST hit the Express API (not Vercel). Vite/local and Render both serve /api/auth/*.
  auth0CallbackUrl:
    process.env.AUTH0_CALLBACK_URL ||
    `${process.env.API_PUBLIC_URL || `http://localhost:${Number(process.env.PORT) || 5000}`}/api/auth/auth0/callback`,
  apiPublicUrl: process.env.API_PUBLIC_URL || `http://localhost:${Number(process.env.PORT) || 5000}`
};
