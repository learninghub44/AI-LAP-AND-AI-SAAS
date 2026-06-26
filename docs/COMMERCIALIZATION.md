# Commercialization Plan

This fork can be modified and monetized under the MIT License. Keep the
original `LICENSE` file and the original copyright notice in distributed
copies. Add your own copyright notice for new work in `NOTICE` when the fork
has a business name or company owner.

## What We Should Sell

The upstream app is strongest as a local, OpenAI-compatible LLM router. The
best first paid product is not "free API resale"; it is an operations layer
for people who already bring their own provider keys.

Recommended paid tiers:

- Free: local router, dashboard, provider keys, fallback routing, monthly model
  catalog snapshot.
- Pro: live model catalog, better provider health intelligence, advanced
  analytics retention, exportable usage reports, priority catalog updates.
- Team: multi-user admin, per-user API keys, quotas, audit logs, shared
  provider-key pools.
- Hosted: managed deployment, backups, monitoring, custom domain, support.

## Recommended Product Name

Working name: **Cotell AI**

Tagline: **One reliable AI gateway for every model your team already uses.**

Why this name works:

- "Relay" says the product routes traffic instead of pretending to own the
  underlying models.
- "Grid" suggests many providers, failover paths, and operational control.
- It is easier to sell to teams than a name built around "free" providers.

Other good options:

- **ModelRelay** — simple and direct.
- **KeyPilot AI** — friendly for teams managing many provider keys.
- **RouteLLM** — technical, clear, developer-first.
- **Switchboard AI** — human, memorable, strong for a dashboard product.

Before public launch, run a trademark/domain check and choose the name with
the cleanest `.com`, local country domain, and social handles.

## Payment And Database Choice

Use **Paystack** for payments and **Postgres** for the hosted
license/customer backend.

For Railway-first SaaS, start with **Railway Postgres** because it is simplest
to deploy beside the API service. Use **Supabase Postgres** if we want
Supabase Auth, Row Level Security, and a faster customer portal later.

Recommended architecture:

- Local customer app:
  - Keeps SQLite for local provider keys, routing data, analytics, and offline
    operation.
  - Talks to your license/catalog API only for premium activation and catalog
    updates.
- Hosted backend:
  - Supabase Postgres stores customers, purchases, subscriptions, license keys,
    catalog versions, and audit events.
  - Paystack handles checkout, recurring billing where available, and payment
    confirmation.
  - A small Node/Express or serverless API exposes the license/catalog endpoints
    already expected by this app.

Do not move the local app to Supabase yet. That would make the product harder
to run and less private. Supabase belongs behind your business backend first.

## Paystack Flow

1. Customer clicks "Go Premium" on your website.
2. Your backend creates a Paystack transaction or subscription checkout.
3. Customer pays on Paystack.
4. Paystack redirects back to your website.
5. Your backend verifies the transaction amount, currency, reference, and
   payment status.
6. Your backend creates or updates the customer license in Supabase.
7. The customer receives a license key by email and can paste it into the app.
8. The app calls your `/v1/license/activate` endpoint and receives the premium
   catalog entitlement.

Webhooks should update the license when payment succeeds, renews, fails,
expires, is refunded, or is canceled. The app should never store Paystack
secret keys.

## Supabase Tables To Start With

- `customers`
  - `id`, `email`, `name`, `country`, `company`, `created_at`
- `plans`
  - `id`, `slug`, `name`, `price_minor`, `currency`, `billing_interval`,
    `features`
- `licenses`
  - `id`, `customer_id`, `key_hash`, `plan_slug`, `status`, `expires_at`,
    `created_at`
- `payments`
  - `id`, `customer_id`, `provider`, `reference`, `amount_minor`, `currency`,
    `status`, `raw_event`, `created_at`
- `catalog_releases`
  - `id`, `version`, `tier`, `signed_payload`, `signature`, `created_at`
- `audit_events`
  - `id`, `customer_id`, `action`, `metadata`, `created_at`

Store only a hash of each license key. Show the raw key once when it is created.

## Website Pages And Contacts

Minimum public pages:

- Home
- Pricing
- Docs
- Download
- Contact
- Terms
- Privacy
- Refund policy
- Status

Suggested contact surface:

- Support: `support@cotell.ai`
- Sales: `sales@cotell.ai`
- Billing: `billing@cotell.ai`
- Security: `security@cotell.ai`
- Abuse: `abuse@cotell.ai`
- WhatsApp/phone for regional customers
- GitHub issues for open-source/community support

Use placeholder domains until the final name is registered.

## License Guardrails

- Keep `LICENSE` unchanged unless a lawyer explicitly advises otherwise.
- Keep the original copyright notice in `LICENSE` and `NOTICE`.
- Do not imply the original author endorses this fork.
- Rebrand the product before selling it publicly.
- Point payment, license, catalog, docs, installers, and support links to your
  own domains and infrastructure.
- Review each upstream LLM provider's terms before advertising commercial use.

## Technical Roadmap

1. Rebrand visible UI, desktop package metadata, Docker image names, docs, and
   installer links.
2. Replace the default premium links and catalog service with your own backend:
   `PREMIUM_SITE_URL`, `CATALOG_BASE_URL`, and `CATALOG_PUBKEY`.
3. Build a Paystack + Supabase license service with:
   - `POST /v1/license/activate`
   - `GET /v1/license/check`
   - `POST /v1/portal`
   - `GET /v1/latest`
4. Add signed catalog publishing so paid users receive the live feed and free
   users receive the slower snapshot.
5. Add multi-tenant controls before offering a team or hosted product.
6. Add billing integration, webhook handling, invoice/portal links, and
   entitlement tests.
7. Add deployment docs for Docker, desktop, and hosted SaaS.

## First Engineering Milestones

- Milestone 1: Fork hygiene
  - Preserve MIT license.
  - Add `NOTICE`.
  - Document commercial-fork configuration.
  - Remove or replace upstream sales links before release.

- Milestone 2: Brand and packaging
  - Choose product name.
  - Update dashboard, desktop app, package names, Docker image names, and docs.
  - Keep internal API compatibility where existing users benefit from it.

- Milestone 3: Monetization backend
  - Implement license validation and signed catalog service.
  - Connect Stripe or another payment provider.
  - Ship Pro entitlements through environment-configured endpoints.

- Milestone 4: Paid value
  - Multi-user auth.
  - Per-user API keys and quotas.
  - Usage reports and CSV export.
  - Provider reliability alerts.

## Environment Variables For A Commercial Fork

Set these before selling the fork publicly:

```env
PREMIUM_SITE_URL=https://your-product.example
CATALOG_BASE_URL=https://api.your-product.example
CATALOG_PUBKEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

During development, you can disable catalog polling:

```env
CATALOG_SYNC_DISABLED=1
```
