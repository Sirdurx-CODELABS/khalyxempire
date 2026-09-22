import { Order } from '../../models/Order.js';
import { HttpError } from '../../middleware/error.js';
import { toKobo } from '@khalyx/shared';
import { markOrderPaid } from '../orders.js';
import { paystackWebhookValid, verifyPaystack } from './paystack.js';
import { flutterwaveWebhookValid, verifyFlutterwave, verifyFlutterwaveByReference } from './flutterwave.js';
import { env } from '../../config/env.js';

const PAID = ['paid', 'processing', 'shipped', 'delivered'];

function publicWebhookUrls() {
  const apiBase = env.apiPublicUrl || `http://localhost:${env.port || 5000}`;
  return {
    paystack: `${apiBase.replace(/\/$/, '')}/api/payments/paystack/webhook`,
    flutterwave: `${apiBase.replace(/\/$/, '')}/api/payments/flutterwave/webhook`
  };
}

export function webhookInfo() {
  return {
    urls: publicWebhookUrls(),
    paystack: {
      signatureHeader: 'x-paystack-signature',
      events: ['charge.success'],
      configured: Boolean(env.paystackSecret)
    },
    flutterwave: {
      signatureHeader: 'verif-hash',
      events: ['charge.completed'],
      configured: Boolean(env.flutterwaveSecret),
      hashConfigured: Boolean(env.flutterwaveHash)
    }
  };
}

async function findOrderByReference(reference) {
  if (!reference) return null;
  return Order.findOne({ 'payment.reference': String(reference) });
}

function amountMatchesPaystack(order, data) {
  const paid = Number(data?.amount);
  if (!Number.isFinite(paid)) return true;
  return Math.abs(paid - toKobo(order.total)) <= 1;
}

function amountMatchesFlutterwave(order, data) {
  const paid = Number(data?.amount);
  if (!Number.isFinite(paid)) return true;
  const currency = String(data?.currency || 'NGN').toUpperCase();
  if (currency !== 'NGN') return false;
  return Math.abs(paid - Number(order.total)) < 1;
}

export async function fulfillPayment({ provider, reference, raw, verifiedAmountOk = true }) {
  const order = await findOrderByReference(reference);
  if (!order) throw new HttpError(404, 'Order not found for that payment reference');
  if (PAID.includes(order.status)) return { order, alreadyPaid: true };
  if (!verifiedAmountOk) throw new HttpError(400, 'Paid amount does not match this order');
  await markOrderPaid(order, { provider, reference, raw });
  return { order, alreadyPaid: false };
}

/**
 * Paystack webhook: verify HMAC, re-verify transaction, then mark paid.
 * Dashboard URL: POST /api/payments/paystack/webhook
 */
export async function handlePaystackWebhook(req) {
  if (!env.paystackSecret) {
    return { status: 503, body: { message: 'Paystack is not configured' } };
  }
  if (!paystackWebhookValid(req)) {
    return { status: 401, body: { message: 'Invalid Paystack signature' } };
  }

  const event = req.body;
  const eventName = event?.event;
  if (eventName !== 'charge.success') {
    return { status: 200, body: { received: true, ignored: eventName || 'unknown' } };
  }

  const reference = event?.data?.reference;
  if (!reference) {
    return { status: 200, body: { received: true, ignored: 'missing_reference' } };
  }

  let verified;
  try {
    verified = await verifyPaystack(reference);
  } catch {
    return { status: 400, body: { message: 'Could not verify Paystack transaction' } };
  }

  if (String(verified.status).toLowerCase() !== 'success') {
    return { status: 200, body: { received: true, ignored: 'not_successful', status: verified.status } };
  }

  const order = await findOrderByReference(verified.reference || reference);
  if (!order) {
    return { status: 200, body: { received: true, ignored: 'order_not_found', reference } };
  }
  if (!amountMatchesPaystack(order, verified)) {
    return { status: 400, body: { message: 'Amount mismatch', reference } };
  }

  const result = await fulfillPayment({
    provider: 'paystack',
    reference: verified.reference || reference,
    raw: verified,
    verifiedAmountOk: true
  });

  return {
    status: 200,
    body: {
      received: true,
      fulfilled: true,
      alreadyPaid: result.alreadyPaid,
      orderNumber: result.order.orderNumber
    }
  };
}

/**
 * Flutterwave webhook: verify verif-hash, re-verify transaction, then mark paid.
 * Dashboard URL: POST /api/payments/flutterwave/webhook
 * Set FLUTTERWAVE_WEBHOOK_HASH to the secret hash from Flutterwave → Settings → Webhooks.
 */
export async function handleFlutterwaveWebhook(req) {
  if (!env.flutterwaveSecret) {
    return { status: 503, body: { message: 'Flutterwave is not configured' } };
  }
  if (!env.flutterwaveHash) {
    return {
      status: 503,
      body: {
        message: 'Set FLUTTERWAVE_WEBHOOK_HASH in server/.env to the secret hash from Flutterwave Settings → Webhooks'
      }
    };
  }
  if (!flutterwaveWebhookValid(req)) {
    return { status: 401, body: { message: 'Invalid Flutterwave verif-hash' } };
  }

  const body = req.body || {};
  const eventName = body.event || body['event.type'] || '';
  const data = body.data || body;

  const status = String(data?.status || '').toLowerCase();
  const isSuccessEvent =
    eventName === 'charge.completed' ||
    eventName === 'charge.success' ||
    (!eventName && (status === 'successful' || status === 'success'));

  if (!isSuccessEvent) {
    return { status: 200, body: { received: true, ignored: eventName || status || 'unknown' } };
  }
  if (status && status !== 'successful' && status !== 'success') {
    return { status: 200, body: { received: true, ignored: 'not_successful', status } };
  }

  const txRef = data.tx_ref || data.txRef || body.txRef;
  const transactionId = data.id || data.transaction_id || body.id;

  let verified;
  try {
    if (transactionId) verified = await verifyFlutterwave(transactionId);
    else if (txRef) verified = await verifyFlutterwaveByReference(txRef);
    else return { status: 200, body: { received: true, ignored: 'missing_reference' } };
  } catch {
    return { status: 400, body: { message: 'Could not verify Flutterwave transaction' } };
  }

  const verifiedStatus = String(verified.status || '').toLowerCase();
  if (verifiedStatus !== 'successful' && verifiedStatus !== 'success') {
    return { status: 200, body: { received: true, ignored: 'not_successful', status: verified.status } };
  }

  const reference = verified.tx_ref || txRef;
  const order = await findOrderByReference(reference);
  if (!order) {
    return { status: 200, body: { received: true, ignored: 'order_not_found', reference } };
  }
  if (!amountMatchesFlutterwave(order, verified)) {
    return { status: 400, body: { message: 'Amount mismatch', reference } };
  }

  const result = await fulfillPayment({
    provider: 'flutterwave',
    reference,
    raw: verified,
    verifiedAmountOk: true
  });

  return {
    status: 200,
    body: {
      received: true,
      fulfilled: true,
      alreadyPaid: result.alreadyPaid,
      orderNumber: result.order.orderNumber
    }
  };
}
