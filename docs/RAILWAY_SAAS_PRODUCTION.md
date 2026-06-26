# Railway SaaS Production Plan

Cotell AI should be deployed as a hosted SaaS gateway, not as the original
single-user local app exposed to the internet.

The product promise:

> Customers pay for a plan, receive Cotell API keys, and can call an
> OpenAI-compatible endpoint. Their plan controls which model groups they can
> use and how much monthly usage they receive.

Free access rule:

> A free API key can use only the `free` model group. Paid plans unlock the
> other model groups and raw catalog model IDs.

## Recommended Railway Services

Start with three Railway services:

- `cotell-api`
  - Node/TypeScript API service.
  - Hosts checkout callbacks, Paystack webhooks, customer API-key issuance,
    model entitlement checks, and `/v1/*` proxy requests.
- `cotell-postgres`
  - Railway PostgreSQL for production SaaS data: customers, plans, API keys,
    subscriptions, usage, and audit events.
- `cotell-worker`
  - Later service for catalog refreshes, payment reconciliation, email retries,
    and usage rollups.

Use Supabase instead of Railway Postgres only if we want Supabase Auth, hosted
customer login, and Row Level Security in the portal. For the first Railway
deployment, Railway Postgres is simpler because it is private and close to the
API service.

## Current Repo Status

The current upstream app is a strong router, but it is still mostly
single-tenant:

- one local SQLite database
- one unified API key
- local admin dashboard
- provider keys stored in local encrypted SQLite

Before selling public API access, we need a SaaS layer:

- tenant/customer records
- paid plans
- hashed customer API keys
- per-key model entitlement checks
- monthly usage counters
- Paystack payment lifecycle
- abuse controls
- admin operations

This product must ship with `SAAS_MODE=1` in Railway. In SaaS mode, `/v1/*`
requests are authenticated against Railway Postgres customer API keys before
the existing router sees them. The SaaS middleware rewrites free requests to
`SAAS_FREE_MODEL_ID`, then passes the request to the existing router with the
internal unified key.

## Production Request Flow

1. User pays through Paystack.
2. Paystack redirects and sends a webhook.
3. `cotell-api` verifies the Paystack transaction.
4. The database marks the subscription/license active.
5. Customer creates an API key in the portal.
6. API key is stored hashed; raw key is shown once.
7. Customer calls `POST /v1/chat/completions`.
8. Gateway authenticates the API key.
9. Gateway checks:
   - key status
   - plan status
   - monthly request/token quota
   - allowed model group
10. Gateway routes to an upstream model/provider.
11. Gateway records usage and returns the model response.

## Paid Plans

Initial pricing should be simple:

- Starter
  - includes the free model
  - low monthly request/token allowance
  - small and medium model groups
  - email support
- Pro
  - higher monthly allowance
  - large model groups
  - analytics dashboard
  - priority routing
- Business
  - team keys
  - higher quota
  - usage exports
  - priority support

Avoid unlimited plans at launch. AI costs and free-tier provider behavior are
too variable for unlimited pricing to be safe.

## API Key Model Access

Plans should map to model groups instead of individual provider IDs:

- `fast`
  - low-cost, high-speed models
- `balanced`
  - good general models
- `advanced`
  - stronger reasoning/coding models
- `media`
  - image/audio routes, priced separately

Example:

```text
Free     -> free
Starter  -> free, fast, raw
Pro      -> free, fast, balanced, advanced, raw
Business -> free, fast, balanced, advanced, media, embeddings, raw
```

Customers request:

```json
{
  "model": "balanced",
  "messages": [{ "role": "user", "content": "Write a proposal." }]
}
```

The router chooses the actual provider/model behind that group.

## Railway Setup

The repo includes `railway.json` for config-as-code:

- build command: `npm run build`
- start command: `npm run start`
- healthcheck: `/api/ping`
- restart policy: retry on failure

Add variables from `.env.railway.example` in the Railway Variables tab.
Railway provides runtime variables to the service and can suggest variables
from env files.

## Security Rules

- Never store raw API keys.
- Never expose Paystack secret keys to the browser.
- Verify Paystack amount, currency, reference, and status before granting plan
  access.
- Use one-way hashes for customer API keys.
- Rate limit by API key and IP.
- Add request body size limits.
- Log abuse events.
- Keep admin endpoints separate from public `/v1/*` endpoints.
- Use HTTPS-only production domains.

## Launch Checklist

- [ ] Choose final product name and domain.
- [ ] Create Railway project and production environment.
- [ ] Add Railway Postgres or Supabase Postgres.
- [ ] Apply `supabase/saas_schema.sql` or equivalent migration.
- [ ] Add Paystack live keys and webhook URL.
- [ ] Create pricing plans in database.
- [ ] Implement SaaS auth middleware for public API keys.
- [ ] Implement per-plan model group checks.
- [ ] Implement usage limits and monthly reset logic.
- [ ] Build customer portal pages.
- [ ] Build admin pages for customers/payments/usage.
- [ ] Add Terms, Privacy, Refund Policy, and provider ToS disclaimer.
- [ ] Add monitoring and backup process.
