/**
 * Paystack service — KES payments for Cotell AI SaaS.
 * Docs: https://paystack.com/docs/api/
 */

const BASE = 'https://api.paystack.co';

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY ?? '';
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not set');
  return key;
}

async function paystackFetch<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as { status: boolean; data: T; message: string };
  if (!data.status) throw new Error(`Paystack error: ${data.message}`);
  return data.data;
}

export type PaystackInitResult = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export async function initializePayment(opts: {
  email: string;
  amountKobo: number; // amount in smallest unit (kobo for KES = cents)
  reference: string;
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
}): Promise<PaystackInitResult> {
  return paystackFetch<PaystackInitResult>('POST', '/transaction/initialize', {
    email: opts.email,
    amount: opts.amountKobo,
    currency: 'KES',
    reference: opts.reference,
    metadata: opts.metadata ?? {},
    callback_url: opts.callbackUrl,
  });
}

export type PaystackVerifyResult = {
  status: string; // 'success' | 'failed' | 'abandoned'
  reference: string;
  amount: number;
  currency: string;
  customer: { email: string; customer_code: string };
  metadata?: Record<string, unknown>;
};

export async function verifyPayment(reference: string): Promise<PaystackVerifyResult> {
  return paystackFetch<PaystackVerifyResult>('GET', `/transaction/verify/${reference}`);
}

import crypto from 'crypto';

export function validateWebhookSignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('sha512', secretKey())
    .update(body)
    .digest('hex');
  return hash === signature;
}
