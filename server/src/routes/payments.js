import { Router } from 'express';
import { Order } from '../models/Order.js';
import { HttpError } from '../middleware/error.js';
import { paystackWebhookValid, verifyPaystack } from '../services/payment/paystack.js';
import { flutterwaveWebhookValid, verifyFlutterwave } from '../services/payment/flutterwave.js';
import { markOrderPaid, publicOrder } from '../services/orders.js';
import { availableProviders } from '../services/payment/index.js';

const router = Router();

router.get('/providers', (_req, res) => {
  res.json({ providers: availableProviders() });
});

async function fulfillByReference(reference, extra = {}) {
  const order = await Order.findOne({ 'payment.reference': reference });
  if (!order) throw new HttpError(404, 'Order not found for that payment');
  await markOrderPaid(order, { reference, ...extra });
  return order;
}

router.get('/verify', async (req, res) => {
  const { provider, reference, transaction_id } = req.query;
  if (provider === 'paystack' && reference) {
    const data = await verifyPaystack(reference);
    if (data.status !== 'success') throw new HttpError(400, 'Payment not successful');
    const order = await fulfillByReference(data.reference, { provider: 'paystack', raw: data });
    return res.json({ order: publicOrder(order) });
  }
  if (provider === 'flutterwave' && (transaction_id || reference)) {
    const data = await verifyFlutterwave(transaction_id);
    if (data.status !== 'successful') throw new HttpError(400, 'Payment not successful');
    const order = await fulfillByReference(data.tx_ref, { provider: 'flutterwave', raw: data });
    return res.json({ order: publicOrder(order) });
  }
  if (provider === 'simulate' && reference) {
    const order = await fulfillByReference(reference, { provider: 'simulate' });
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
  if (!paystackWebhookValid(req)) return res.status(401).json({ message: 'Invalid signature' });
  const event = req.body;
  if (event?.event === 'charge.success') {
    const reference = event.data?.reference;
    if (reference) {
      const order = await Order.findOne({ 'payment.reference': reference });
      if (order) await markOrderPaid(order, { provider: 'paystack', reference, raw: event.data });
    }
  }
  res.json({ received: true });
});

router.post('/flutterwave/webhook', async (req, res) => {
  if (!flutterwaveWebhookValid(req)) return res.status(401).json({ message: 'Invalid hash' });
  const body = req.body;
  if (body?.event === 'charge.completed' && body.data?.status === 'successful') {
    const txRef = body.data.tx_ref;
    const order = await Order.findOne({ 'payment.reference': txRef });
    if (order) await markOrderPaid(order, { provider: 'flutterwave', reference: txRef, raw: body.data });
  }
  res.json({ received: true });
});

export default router;
