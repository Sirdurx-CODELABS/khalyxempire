import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { toKobo } from '@khalyx/shared';
import { HttpError } from '../../middleware/error.js';

export function paystackConfigured() {
  return Boolean(env.paystackSecret);
}

export async function initializePaystack(order) {
  const email = order.guestEmail || order.user?.email;
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.paystackSecret}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      amount: toKobo(order.total),
      reference: order.payment.reference,
      callback_url: `${env.clientUrl}/order/${order.orderNumber}?paid=1&provider=paystack`,
      metadata: { orderNumber: order.orderNumber, orderId: String(order._id) }
    })
  });
  const data = await res.json();
  if (!data.status) {
    throw new HttpError(502, data.message || 'Paystack initialize failed');
  }
  return {
    provider: 'paystack',
    authorizationUrl: data.data.authorization_url,
    reference: data.data.reference,
    publicKey: env.paystackPublic
  };
}

export async function verifyPaystack(reference) {
  const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${env.paystackSecret}` }
  });
  const data = await res.json();
  if (!data.status) {
    throw new HttpError(400, data.message || 'Paystack verify failed');
  }
  return data.data;
}

export function paystackWebhookValid(req) {
  const signature = req.headers['x-paystack-signature'];
  if (!signature || !env.paystackSecret) return false;
  const hash = crypto.createHmac('sha512', env.paystackSecret).update(req.rawBody || '').digest('hex');
  return hash === signature;
}
