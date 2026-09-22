import { Router } from 'express';
import { requireAdmin } from '../../middleware/admin.js';
import { getStoreSettings, publicPosSettings } from '../../services/settings.js';
import { auth0Enabled } from '../../services/auth0.js';
import { paymentOptions } from '../../services/payment/index.js';
import { webhookInfo } from '../../services/payment/webhooks.js';
import { env } from '../../config/env.js';

const router = Router();

router.get('/', async (_req, res) => {
  const settings = await getStoreSettings();
  const payments = paymentOptions();
  res.json({
    ...publicPosSettings(settings),
    integrations: {
      auth0: {
        enabled: auth0Enabled(),
        domain: env.auth0Domain || '',
        callbackUrl: env.auth0CallbackUrl
      },
      payments,
      webhooks: webhookInfo()
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
  await settings.save();
  res.json(publicPosSettings(settings));
});

export default router;
