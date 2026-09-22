import { env } from '../../config/env.js';
import { HttpError } from '../../middleware/error.js';

export function flutterwaveConfigured() {
  return Boolean(env.flutterwaveSecret);
}

export async function initializeFlutterwave(order) {
  const email = order.guestEmail || order.user?.email;
  const res = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.flutterwaveSecret}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tx_ref: order.payment.reference,
      amount: order.total,
      currency: 'NGN',
      redirect_url: `${env.clientUrl}/order/${order.orderNumber}?paid=1&provider=flutterwave`,
      customer: {
        email,
        name: order.guestName || order.shippingAddress?.fullName,
        phonenumber: order.guestPhone || order.shippingAddress?.phone
      },
      customizations: {
        title: 'Khalyx Empire',
        description: `Order ${order.orderNumber}`
      },
      meta: { orderNumber: order.orderNumber, orderId: String(order._id) }
    })
  });
  const data = await res.json();
  if (data.status !== 'success') {
    throw new HttpError(502, data.message || 'Flutterwave initialize failed');
  }
  return {
    provider: 'flutterwave',
    authorizationUrl: data.data.link,
    reference: order.payment.reference,
    publicKey: env.flutterwavePublic
  };
}

export async function verifyFlutterwave(transactionId) {
  const res = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${env.flutterwaveSecret}` }
  });
  const data = await res.json();
  if (data.status !== 'success') {
    throw new HttpError(400, data.message || 'Flutterwave verify failed');
  }
  return data.data;
}

export async function verifyFlutterwaveByReference(txRef) {
  const res = await fetch(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
    { headers: { Authorization: `Bearer ${env.flutterwaveSecret}` } }
  );
  const data = await res.json();
  if (data.status !== 'success') {
    throw new HttpError(400, data.message || 'Flutterwave verify by reference failed');
  }
  return data.data;
}

export function flutterwaveWebhookValid(req) {
  const hash = req.headers['verif-hash'];
  if (!env.flutterwaveHash || !hash) return false;
  return hash === env.flutterwaveHash;
}
