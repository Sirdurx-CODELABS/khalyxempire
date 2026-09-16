import { paystackConfigured, initializePaystack, verifyPaystack } from './paystack.js';
import { flutterwaveConfigured, initializeFlutterwave, verifyFlutterwave } from './flutterwave.js';
import { HttpError } from '../../middleware/error.js';

export function availableProviders() {
  const list = [];
  if (paystackConfigured()) list.push('paystack');
  if (flutterwaveConfigured()) list.push('flutterwave');
  if (!list.length) list.push('simulate');
  return list;
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
