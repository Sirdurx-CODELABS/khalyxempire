import { paystackConfigured, initializePaystack, verifyPaystack } from './paystack.js';
import { flutterwaveConfigured, initializeFlutterwave, verifyFlutterwave } from './flutterwave.js';
import { HttpError } from '../../middleware/error.js';
import { env } from '../../config/env.js';

export function availableProviders() {
  const list = [];
  if (paystackConfigured()) list.push('paystack');
  if (flutterwaveConfigured()) list.push('flutterwave');
  if (!list.length) list.push('simulate');
  return list;
}

export function paymentOptions() {
  const paystack = paystackConfigured();
  const flutterwave = flutterwaveConfigured();
  const providers = availableProviders();
  const details = providers.map((id) => {
    if (id === 'paystack') return { id, label: 'Paystack', configured: true };
    if (id === 'flutterwave') return { id, label: 'Flutterwave', configured: true };
    return {
      id: 'simulate',
      label: 'Test payment',
      configured: true,
      note: 'Add PAYSTACK_SECRET_KEY or FLUTTERWAVE_SECRET_KEY in server/.env to accept real cards.'
    };
  });
  return {
    providers,
    details,
    publicKeys: {
      paystack: env.paystackPublic || '',
      flutterwave: env.flutterwavePublic || ''
    },
    mode: paystack || flutterwave ? 'configured' : 'simulate'
  };
}

export async function initializePayment(order, provider) {
  const chosen = provider || availableProviders()[0];
  if (chosen === 'simulate' || (chosen === 'paystack' && !paystackConfigured()) || (chosen === 'flutterwave' && !flutterwaveConfigured())) {
    return {
      provider: 'simulate',
      authorizationUrl: null,
      reference: order.payment.reference,
      simulate: true
    };
  }
  if (chosen === 'paystack') return initializePaystack(order);
  if (chosen === 'flutterwave') return initializeFlutterwave(order);
  throw new HttpError(400, 'Unknown payment provider');
}

export async function verifyProviderPayment(provider, reference) {
  if (provider === 'paystack') return verifyPaystack(reference);
  if (provider === 'flutterwave') return verifyFlutterwave(reference);
  if (provider === 'simulate') return { status: 'success', amount: 0 };
  throw new HttpError(400, 'Unknown payment provider');
}
