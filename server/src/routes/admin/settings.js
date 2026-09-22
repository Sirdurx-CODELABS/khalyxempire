import { Router } from 'express';
import { requireAdmin } from '../../middleware/admin.js';
import { getStoreSettings, publicSettings } from '../../services/settings.js';
import { auth0Enabled } from '../../services/auth0.js';
import { paymentOptions } from '../../services/payment/index.js';
import { webhookInfo } from '../../services/payment/webhooks.js';
import { env } from '../../config/env.js';

const router = Router();

router.get('/', async (_req, res) => {
  const settings = await getStoreSettings();
  const payments = paymentOptions();
  const callbackUrl = env.auth0CallbackUrl;
  const clientUrl = env.clientUrl.replace(/\/$/, '');
  const apiPublicUrl = env.apiPublicUrl.replace(/\/$/, '');
  res.json({
    ...publicSettings(settings),
    integrations: {
      auth0: {
        enabled: auth0Enabled(),
        domain: env.auth0Domain || '',
        callbackUrl,
        clientUrl,
        apiPublicUrl,
        authorizeUrl: auth0Enabled() ? `${apiPublicUrl}/api/auth/google` : '',
        allowedCallbackUrls: [callbackUrl],
        allowedLogoutUrls: [clientUrl, `${clientUrl}/`],
        allowedWebOrigins: [clientUrl],
        applicationLoginUri: `${clientUrl}/login`,
        dashboardHint: auth0Enabled()
          ? `Paste this exact Callback URL into Auth0 Application Settings: ${callbackUrl}`
          : 'Add AUTH0_* keys on the API host and restart.'
      },
      payments,
      webhooks: webhookInfo(),
      smtp: {
        configured: Boolean(env.smtpHost && env.smtpUser),
        from: env.smtpFrom || '',
        host: env.smtpHost || ''
      },
      urls: {
        clientUrl,
        adminUrl: env.adminUrl,
        erpUrl: env.erpUrl,
        apiPublicUrl
      }
    }
  });
});

router.patch('/', requireAdmin, async (req, res) => {
  const settings = await getStoreSettings();
  const bulk = req.body.posBulk || {};
  if (bulk.enabled !== undefined) settings.posBulk.enabled = Boolean(bulk.enabled);
  if (bulk.scope) settings.posBulk.scope = bulk.scope === 'cart' ? 'cart' : 'same_product';
  if (bulk.threshold !== undefined) settings.posBulk.threshold = Math.max(1, Number(bulk.threshold) || 1);
  if (bulk.percent !== undefined) settings.posBulk.percent = Math.max(0, Math.min(90, Number(bulk.percent) || 0));

  const store = req.body.store || {};
  if (!settings.store) settings.store = {};
  const assign = (key, transform = (v) => v) => {
    if (store[key] !== undefined) settings.store[key] = transform(store[key]);
  };
  assign('storeName', (v) => String(v || '').trim() || 'Khalyx Empire');
  assign('tagline', (v) => String(v || '').trim());
  assign('supportEmail', (v) => String(v || '').trim());
  assign('supportPhone', (v) => String(v || '').trim());
  assign('address', (v) => String(v || '').trim());
  assign('currency', (v) => String(v || 'NGN').trim().toUpperCase());
  assign('shippingFee', (v) => Math.max(0, Number(v) || 0));
  assign('freeShippingThreshold', (v) => Math.max(0, Number(v) || 0));
  assign('whatsappNumber', (v) => String(v || '').replace(/\D/g, ''));
  assign('whatsappGroup', (v) => String(v || '').trim());
  assign('taxNote', (v) => String(v || '').trim());

  settings.markModified('store');
  settings.markModified('posBulk');
  await settings.save();
  res.json(publicSettings(settings));
});

export default router;
