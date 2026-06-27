/**
 * SaaS Postgres DB initialiser.
 * Creates all tables and seeds plans on startup when SAAS_MODE=1.
 * Safe to run multiple times — all DDL uses IF NOT EXISTS / ON CONFLICT DO NOTHING.
 */

type PgPool = {
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
};

let pool: PgPool | null = null;

export async function getSaasPool(): Promise<PgPool> {
  if (pool) return pool;
  const { Pool } = await import('pg');
  if (!process.env.DATABASE_URL) {
    throw new Error('SAAS_MODE=1 requires DATABASE_URL (Railway Postgres).');
  }
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === '0' ? false : { rejectUnauthorized: false },
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  }) as unknown as PgPool;
  return pool;
}

const SCHEMA_SQL = `
create extension if not exists pgcrypto;

do $$ begin
  create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'expired', 'refunded');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type api_key_status as enum ('active', 'revoked', 'suspended');
exception when duplicate_object then null;
end $$;

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  company text,
  country text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  currency text not null default 'KES',
  amount_minor integer not null check (amount_minor >= 0),
  billing_interval text not null check (billing_interval in ('monthly', 'annual', 'lifetime')),
  monthly_request_limit integer not null check (monthly_request_limit >= 0),
  monthly_token_limit bigint not null default 0 check (monthly_token_limit >= 0),
  allowed_model_groups text[] not null default '{}',
  features jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  plan_id uuid not null references plans(id),
  status subscription_status not null default 'active',
  provider text not null default 'paystack',
  provider_customer_code text,
  provider_subscription_code text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  subscription_id uuid references subscriptions(id) on delete set null,
  name text not null default 'Default key',
  key_prefix text not null,
  key_hash text not null unique,
  status api_key_status not null default 'active',
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  subscription_id uuid references subscriptions(id) on delete set null,
  provider text not null default 'paystack',
  reference text not null unique,
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null,
  status text not null,
  paid_at timestamptz,
  raw_event jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references api_keys(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  subscription_id uuid references subscriptions(id) on delete set null,
  requested_model text,
  resolved_platform text,
  resolved_model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  status text not null,
  latency_ms integer not null default 0,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_key_month_idx on usage_events (api_key_id, created_at);
create index if not exists usage_events_customer_month_idx on usage_events (customer_id, created_at);
`;

// Plans seeded separately so we can upsert (update limits if changed)
const SEED_PLANS_SQL = `
insert into plans (slug, name, currency, amount_minor, billing_interval, monthly_request_limit, monthly_token_limit, allowed_model_groups, features)
values
  ('free',             'Free',     'KES',       0, 'monthly',   100,   250000, array['free'],                                                           '{"support":"community","free_model":true}'),
  ('starter-monthly',  'Starter',  'KES',  150000, 'monthly',  1000,  2000000, array['free','fast','raw'],                                              '{"support":"email"}'),
  ('pro-monthly',      'Pro',      'KES',  450000, 'monthly', 10000, 25000000, array['free','fast','balanced','advanced','raw'],                        '{"support":"priority","analytics":true}'),
  ('business-monthly', 'Business', 'KES', 1200000, 'monthly', 50000,150000000, array['free','fast','balanced','advanced','media','embeddings','raw'],   '{"support":"priority","team_keys":true,"exports":true}')
on conflict (slug) do update set
  amount_minor          = excluded.amount_minor,
  monthly_request_limit = excluded.monthly_request_limit,
  monthly_token_limit   = excluded.monthly_token_limit,
  allowed_model_groups  = excluded.allowed_model_groups,
  features              = excluded.features;
`;

export async function initSaasDb(): Promise<void> {
  if (process.env.SAAS_MODE !== '1') return;
  console.log('[saas-db] Initialising SaaS schema on Postgres...');
  try {
    const pg = await getSaasPool();
    await pg.query(SCHEMA_SQL);
    await pg.query(SEED_PLANS_SQL);
    console.log('[saas-db] Schema + plans ready ✓');
  } catch (err) {
    console.error('[saas-db] Init failed:', err instanceof Error ? err.message : err);
  }
}
