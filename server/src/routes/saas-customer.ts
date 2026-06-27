/**
 * Public SaaS customer routes — no admin auth required.
 * 
 * POST /api/saas/signup          Create account + init payment
 * GET  /api/saas/payment/verify  Paystack callback — activate subscription
 * POST /api/saas/webhook         Paystack webhook for renewals / refunds
 * GET  /api/saas/plans           Public plan list
 * POST /api/saas/me              Get my subscription by email + API key
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import { getSaasPool } from '../services/saas-db.js';
import { initializePayment, verifyPayment, validateWebhookSignature } from '../services/paystack.js';
import { hashApiKey } from '../services/saas.js';

export const saasCustomerRouter = Router();

// ── helpers ──────────────────────────────────────────────────────────────────

function isSaas() {
  return process.env.SAAS_MODE === '1';
}

function requireSaas(res: Response): boolean {
  if (!isSaas()) {
    res.status(503).json({ error: 'SaaS mode is not enabled on this instance.' });
    return false;
  }
  return true;
}

function generateApiKey(): string {
  return `cotell-${crypto.randomBytes(24).toString('hex')}`;
}

function generateRef(): string {
  return `ctl-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}

// ── GET /api/saas/plans ───────────────────────────────────────────────────────

saasCustomerRouter.get('/plans', async (_req: Request, res: Response) => {
  if (!requireSaas(res)) return;
  try {
    const pg = await getSaasPool();
    const { rows } = await pg.query<{
      slug: string; name: string; amount_minor: number; billing_interval: string;
      monthly_request_limit: number; monthly_token_limit: string;
      allowed_model_groups: string[]; features: Record<string, unknown>;
    }>(
      `SELECT slug, name, amount_minor, billing_interval,
              monthly_request_limit, monthly_token_limit,
              allowed_model_groups, features
       FROM plans WHERE is_public = true ORDER BY amount_minor`,
    );
    res.json({ plans: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── POST /api/saas/signup ─────────────────────────────────────────────────────

saasCustomerRouter.post('/signup', async (req: Request, res: Response) => {
  if (!requireSaas(res)) return;

  const { email, name, planSlug } = req.body as { email?: string; name?: string; planSlug?: string };
  if (!email || !planSlug) {
    res.status(400).json({ error: 'email and planSlug are required' });
    return;
  }

  try {
    const pg = await getSaasPool();

    // Get plan
    const planRes = await pg.query<{ id: string; name: string; amount_minor: number }>(
      `SELECT id, name, amount_minor FROM plans WHERE slug = $1 AND is_public = true LIMIT 1`,
      [planSlug],
    );
    if (!planRes.rows[0]) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }
    const plan = planRes.rows[0];

    // Upsert customer
    await pg.query(
      `INSERT INTO customers (email, name) VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, updated_at = now()`,
      [email.toLowerCase().trim(), name ?? ''],
    );
    const custRes = await pg.query<{ id: string }>(
      `SELECT id FROM customers WHERE email = $1 LIMIT 1`,
      [email.toLowerCase().trim()],
    );
    const customerId = custRes.rows[0].id;

    // Free plan — create subscription + API key immediately, no payment
    if (plan.amount_minor === 0) {
      const apiKey = generateApiKey();
      const keyHash = hashApiKey(apiKey);
      const prefix = apiKey.slice(0, 12);

      await pg.query(
        `INSERT INTO subscriptions (customer_id, plan_id, status, provider, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', 'free', now(), now() + interval '30 days')
         ON CONFLICT DO NOTHING`,
        [customerId, plan.id],
      );
      const subRes = await pg.query<{ id: string }>(
        `SELECT id FROM subscriptions WHERE customer_id = $1 AND plan_id = $2 LIMIT 1`,
        [customerId, plan.id],
      );
      const subId = subRes.rows[0].id;

      await pg.query(
        `INSERT INTO api_keys (customer_id, subscription_id, name, key_prefix, key_hash)
         VALUES ($1, $2, 'Default key', $3, $4)
         ON CONFLICT DO NOTHING`,
        [customerId, subId, prefix, keyHash],
      );

      res.json({ type: 'free', apiKey, planName: plan.name });
      return;
    }

    // Paid plan — init Paystack
    const reference = generateRef();
    const appUrl = (process.env.DASHBOARD_ORIGINS ?? '').split(',')[0].trim() ||
      `https://${req.headers.host}`;
    const callbackUrl = `${appUrl}/portal/verify?ref=${reference}`;

    const paystack = await initializePayment({
      email: email.toLowerCase().trim(),
      amountKobo: plan.amount_minor,
      reference,
      metadata: { customerId, planId: plan.id, planSlug },
      callbackUrl,
    });

    // Record pending payment
    await pg.query(
      `INSERT INTO payments (customer_id, provider, reference, amount_minor, currency, status)
       VALUES ($1, 'paystack', $2, $3, 'KES', 'pending')
       ON CONFLICT (reference) DO NOTHING`,
      [customerId, reference, plan.amount_minor],
    );

    res.json({
      type: 'payment',
      authorizationUrl: paystack.authorization_url,
      reference,
    });
  } catch (err) {
    console.error('[saas] signup error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// ── GET /api/saas/payment/verify?ref=xxx ─────────────────────────────────────

saasCustomerRouter.get('/payment/verify', async (req: Request, res: Response) => {
  if (!requireSaas(res)) return;

  const reference = req.query.ref as string;
  if (!reference) {
    res.status(400).json({ error: 'ref is required' });
    return;
  }

  try {
    const tx = await verifyPayment(reference);
    if (tx.status !== 'success') {
      res.status(402).json({ error: `Payment status: ${tx.status}` });
      return;
    }

    const pg = await getSaasPool();
    const meta = tx.metadata as { customerId?: string; planId?: string } | undefined;
    const customerId = meta?.customerId;
    const planId = meta?.planId;

    if (!customerId || !planId) {
      res.status(400).json({ error: 'Missing metadata on payment. Contact support.' });
      return;
    }

    // Update payment record
    await pg.query(
      `UPDATE payments SET status='success', paid_at=now(), raw_event=$1
       WHERE reference=$2`,
      [JSON.stringify(tx), reference],
    );

    // Create or activate subscription
    const existingSub = await pg.query<{ id: string }>(
      `SELECT id FROM subscriptions WHERE customer_id=$1 AND plan_id=$2 LIMIT 1`,
      [customerId, planId],
    );

    let subId: string;
    if (existingSub.rows[0]) {
      subId = existingSub.rows[0].id;
      await pg.query(
        `UPDATE subscriptions
         SET status='active',
             current_period_start=now(),
             current_period_end=now() + interval '30 days',
             updated_at=now()
         WHERE id=$1`,
        [subId],
      );
    } else {
      const subRes = await pg.query<{ id: string }>(
        `INSERT INTO subscriptions
           (customer_id, plan_id, status, provider, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', 'paystack', now(), now() + interval '30 days')
         RETURNING id`,
        [customerId, planId],
      );
      subId = subRes.rows[0].id;
    }

    // Generate API key if none exists
    const existingKey = await pg.query<{ id: string; key_prefix: string }>(
      `SELECT id, key_prefix FROM api_keys WHERE customer_id=$1 AND status='active' LIMIT 1`,
      [customerId],
    );

    let apiKey: string | null = null;
    if (!existingKey.rows[0]) {
      apiKey = generateApiKey();
      const keyHash = hashApiKey(apiKey);
      const prefix = apiKey.slice(0, 12);
      await pg.query(
        `INSERT INTO api_keys (customer_id, subscription_id, name, key_prefix, key_hash)
         VALUES ($1, $2, 'Default key', $3, $4)`,
        [customerId, subId, prefix, keyHash],
      );
    }

    // Update payment with subscription link
    await pg.query(
      `UPDATE payments SET subscription_id=$1 WHERE reference=$2`,
      [subId, reference],
    );

    res.json({
      success: true,
      apiKey: apiKey ?? '(shown only on first issue — check your email)',
      message: 'Subscription activated',
    });
  } catch (err) {
    console.error('[saas] verify error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// ── POST /api/saas/webhook (Paystack) ────────────────────────────────────────

saasCustomerRouter.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['x-paystack-signature'] as string;
  const rawBody = JSON.stringify(req.body); // express.json already parsed it

  if (!validateWebhookSignature(rawBody, sig)) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  const event = req.body as { event: string; data?: Record<string, unknown> };
  console.log(`[saas-webhook] ${event.event}`);

  try {
    const pg = await getSaasPool();

    if (event.event === 'charge.success') {
      const data = event.data as { reference?: string };
      if (data?.reference) {
        await pg.query(
          `UPDATE payments SET status='success', paid_at=now() WHERE reference=$1`,
          [data.reference],
        );
      }
    }

    if (event.event === 'subscription.disable' || event.event === 'subscription.expiry_update') {
      const data = event.data as { subscription_code?: string };
      if (data?.subscription_code) {
        await pg.query(
          `UPDATE subscriptions SET status='canceled', updated_at=now()
           WHERE provider_subscription_code=$1`,
          [data.subscription_code],
        );
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[saas-webhook] error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// ── POST /api/saas/me ─────────────────────────────────────────────────────────

saasCustomerRouter.post('/me', async (req: Request, res: Response) => {
  if (!requireSaas(res)) return;

  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: 'email required' });
    return;
  }

  try {
    const pg = await getSaasPool();
    const result = await pg.query<{
      email: string; name: string;
      plan_name: string; plan_slug: string;
      sub_status: string; current_period_end: string;
      key_prefix: string;
    }>(
      `SELECT c.email, c.name,
              p.name AS plan_name, p.slug AS plan_slug,
              s.status AS sub_status, s.current_period_end,
              ak.key_prefix
       FROM customers c
       LEFT JOIN subscriptions s ON s.customer_id = c.id AND s.status IN ('trialing','active')
       LEFT JOIN plans p ON p.id = s.plan_id
       LEFT JOIN api_keys ak ON ak.customer_id = c.id AND ak.status = 'active'
       WHERE c.email = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [email.toLowerCase().trim()],
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: 'No account found for that email' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
