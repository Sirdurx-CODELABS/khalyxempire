import { Router } from 'express';
import { Order } from '../models/Order.js';
import { HttpError } from '../middleware/error.js';
import { paystackConfigured, verifyPaystack } from '../services/payment/paystack.js';
import {
  flutterwaveConfigured,
  verifyFlutterwave,
  verifyFlutterwaveByReference
} from '../services/payment/flutterwave.js';
import { markOrderPaid, publicOrder } from '../services/orders.js';
import { availableProviders, paymentOptions } from '../services/payment/index.js';
import {
  fulfillPayment,
  handleFlutterwaveWebhook,
  handlePaystackWebhook,
  webhookInfo
} from '../services/payment/webhooks.js';

const router = Router();

router.get('/providers', (_req, res) => {
  res.json({ ...paymentOptions(), webhooks: webhookInfo() });
});

router.get('/webhooks', (_req, res) => {
  res.json(webhookInfo());
});

router.get('/verify', async (req, res) => {
  const { provider, reference, transaction_id, trxref, tx_ref } = req.query;
  const ref = reference || trxref || tx_ref;

  if (provider === 'paystack' || (!provider && ref && paystackConfigured())) {
    if (!ref) throw new HttpError(400, 'Paystack reference is required');
    const data = await verifyPaystack(ref);
    if (String(data.status).toLowerCase() !== 'success') throw new HttpError(400, 'Payment not successful');
    const { order } = await fulfillPayment({
      provider: 'paystack',
      reference: data.reference || ref,
      raw: data
    });
    return res.json({ order: publicOrder(order) });
  }

  if (provider === 'flutterwave' || (!provider && (transaction_id || ref) && flutterwaveConfigured())) {
    let data;
    if (transaction_id) data = await verifyFlutterwave(transaction_id);
    else if (ref) data = await verifyFlutterwaveByReference(ref);
    else throw new HttpError(400, 'Flutterwave transaction_id or tx_ref is required');
    const status = String(data.status || '').toLowerCase();
    if (status !== 'successful' && status !== 'success') throw new HttpError(400, 'Payment not successful');
    const { order } = await fulfillPayment({
      provider: 'flutterwave',
      reference: data.tx_ref || ref,
      raw: data
    });
    return res.json({ order: publicOrder(order) });
  }

  if (provider === 'simulate' && ref) {
    const { order } = await fulfillPayment({ provider: 'simulate', reference: ref });
    return res.json({ order: publicOrder(order) });
  }

  throw new HttpError(400, 'Missing payment verification details');
});

router.post('/simulate/:orderNumber', async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber });
  if (!order) throw new HttpError(404, 'Order not found');
  if (order.payment.provider !== 'simulate' && availableProviders()[0] !== 'simulate') {
    throw new HttpError(400, 'Simulate is disabled when live keys are set');
  }
  await markOrderPaid(order, { provider: 'simulate', reference: order.payment.reference });
  res.json({ order: publicOrder(order) });
});

router.post('/paystack/webhook', async (req, res) => {
  const result = await handlePaystackWebhook(req);
  res.status(result.status).json(result.body);
});

router.post('/flutterwave/webhook', async (req, res) => {
  const result = await handleFlutterwaveWebhook(req);
  res.status(result.status).json(result.body);
});

export default router;
