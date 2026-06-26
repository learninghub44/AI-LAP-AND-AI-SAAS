# Backend Blueprint

This document describes the hosted service needed to monetize this fork. The
local router should stay easy to run; the paid business logic belongs in a
small hosted backend.

## Stack

- Runtime: Node.js + TypeScript
- API framework: Express, Fastify, or Hono
- Database: Railway Postgres for the first Railway deployment, or Supabase
  Postgres if the customer portal will use Supabase Auth/RLS
- Payments: Paystack
- Email: Resend, Postmark, or Supabase Edge Function plus SMTP
- Hosting: Render, Fly.io, Railway, Vercel Functions, or Supabase Edge
  Functions

## Public Endpoints Needed By The App

The current app already expects these endpoints through `CATALOG_BASE_URL`:

```text
POST /v1/license/activate
GET  /v1/license/check
POST /v1/portal
GET  /v1/latest
```

Suggested website/payment endpoints:

```text
POST /checkout/paystack/initialize
GET  /checkout/paystack/callback
POST /webhooks/paystack
GET  /manage
POST /manage/recover-key
```

Suggested SaaS gateway endpoints:

```text
POST   /v1/chat/completions
GET    /v1/models
POST   /v1/responses
POST   /dashboard/api-keys
GET    /dashboard/usage
GET    /dashboard/billing
```

## License Response Shape

```json
{
  "valid": true,
  "plan": "annual",
  "status": "active",
  "expiresAt": "2027-06-26T00:00:00.000Z",
  "cancelAtPeriodEnd": false
}
```

For invalid keys:

```json
{
  "valid": false,
  "plan": null,
  "status": "inactive",
  "expiresAt": null,
  "reason": "unknown_key"
}
```

Supported invalid reasons should match the local app:

- `unknown_key`
- `expired`
- `canceled`
- `refunded`

## Paystack Rules

- Initialize Paystack transactions from the backend only.
- Verify transaction status before creating a license.
- Verify the paid amount and currency before granting access.
- Store Paystack references in `payments.reference` with a unique constraint.
- Process webhooks idempotently.
- Never expose `PAYSTACK_SECRET_KEY` to the app or browser.

## Supabase Rules

- Use the service role key only on the hosted backend.
- Enable Row Level Security for any table exposed to a browser client.
- Hash license keys before storing them.
- Keep raw Paystack webhook payloads for audit/debugging.
- Use database constraints for payment references and license status values.

## Catalog Signing

The local app verifies catalog signatures with `CATALOG_PUBKEY`. Your backend
should sign the exact JSON bytes returned by `/v1/latest` with an Ed25519
private key and include:

```text
x-catalog-signature: <base64 signature>
```

Keep the private key out of Git. Publish only the public key through
`CATALOG_PUBKEY`.
