import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { getUnifiedApiKey } from '../db/index.js';

type PgPool = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
};

type ApiKeyRow = {
  apiKeyId: string;
  customerId: string;
  subscriptionId: string | null;
  planSlug: string;
  planName: string;
  subscriptionStatus: string;
  monthlyRequestLimit: number;
  monthlyTokenLimit: string | number;
  allowedModelGroups: string[];
};

type UsageRow = {
  requestCount: string | number;
  tokenCount: string | number;
};

export type SaasAuthContext = {
  apiKeyId: string;
  customerId: string;
  subscriptionId: string | null;
  planSlug: string;
  planName: string;
  allowedModelGroups: string[];
  requestedModelGroup: string;
  originalModel: string | null;
  resolvedModel: string | null;
};

declare module 'express-serve-static-core' {
  interface Request {
    saasAuth?: SaasAuthContext;
  }
}

const GROUP_ALIASES = new Set(['free', 'fast', 'balanced', 'advanced', 'media']);

let poolPromise: Promise<PgPool> | null = null;

export function isSaasMode(): boolean {
  return process.env.SAAS_MODE === '1';
}

async function getPool(): Promise<PgPool> {
  if (!poolPromise) {
    poolPromise = import('pg').then(({ Pool }) => {
      if (!process.env.DATABASE_URL) {
        throw new Error('SAAS_MODE=1 requires DATABASE_URL for Railway Postgres.');
      }
      return new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === '0' ? false : { rejectUnauthorized: false },
        max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      }) as PgPool;
    });
  }
  return poolPromise;
}

function extractBearerOrApiKey(req: Request): string | undefined {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  if (bearer) return bearer;
  const apiKeyHeader = req.headers['x-api-key'];
  const xApiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
  return xApiKey?.trim() || undefined;
}

export function hashApiKey(apiKey: string): string {
  const pepper = process.env.API_KEY_PEPPER ?? '';
  return crypto.createHash('sha256').update(`${pepper}:${apiKey}`).digest('hex');
}

function requestedModelFromBody(req: Request): string | null {
  const body = req.body as { model?: unknown } | undefined;
  return typeof body?.model === 'string' && body.model.trim() ? body.model.trim() : null;
}

function classifyRequest(req: Request): { group: string; originalModel: string | null; rewrittenModel: string | null } {
  if (req.method === 'GET' && req.path === '/models') {
    return { group: 'catalog', originalModel: null, rewrittenModel: null };
  }

  if (req.path.startsWith('/images/') || req.path.startsWith('/audio/')) {
    const model = requestedModelFromBody(req);
    return { group: 'media', originalModel: model, rewrittenModel: model };
  }

  if (req.path.startsWith('/embeddings')) {
    const model = requestedModelFromBody(req);
    return { group: 'embeddings', originalModel: model, rewrittenModel: model };
  }

  const originalModel = requestedModelFromBody(req);
  const requested = originalModel?.toLowerCase();
  const freeModel = process.env.SAAS_FREE_MODEL_ID ?? 'openai-fast';

  if (!requested || requested === 'auto' || requested === 'free') {
    return { group: 'free', originalModel, rewrittenModel: freeModel };
  }

  if (GROUP_ALIASES.has(requested)) {
    const envName = `SAAS_${requested.toUpperCase()}_MODEL_ID`;
    return { group: requested, originalModel, rewrittenModel: process.env[envName] ?? originalModel };
  }

  return { group: 'raw', originalModel, rewrittenModel: originalModel };
}

function isGroupAllowed(group: string, allowed: string[]): boolean {
  return allowed.includes('*') || allowed.includes(group) || (group === 'catalog' && allowed.length > 0);
}

function numberFromDb(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value);
}

async function loadApiKey(pool: PgPool, apiKey: string): Promise<ApiKeyRow | null> {
  const result = await pool.query<ApiKeyRow>(
    `
      SELECT
        ak.id AS "apiKeyId",
        ak.customer_id AS "customerId",
        ak.subscription_id AS "subscriptionId",
        p.slug AS "planSlug",
        p.name AS "planName",
        s.status AS "subscriptionStatus",
        p.monthly_request_limit AS "monthlyRequestLimit",
        p.monthly_token_limit AS "monthlyTokenLimit",
        p.allowed_model_groups AS "allowedModelGroups"
      FROM api_keys ak
      JOIN subscriptions s ON s.id = ak.subscription_id
      JOIN plans p ON p.id = s.plan_id
      WHERE ak.key_hash = $1
        AND ak.status = 'active'
        AND s.status IN ('trialing', 'active')
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
      LIMIT 1
    `,
    [hashApiKey(apiKey)],
  );
  return result.rows[0] ?? null;
}

async function loadCurrentUsage(pool: PgPool, customerId: string): Promise<UsageRow> {
  const result = await pool.query<UsageRow>(
    `
      SELECT
        COUNT(*) AS "requestCount",
        COALESCE(SUM(input_tokens + output_tokens), 0) AS "tokenCount"
      FROM usage_events
      WHERE customer_id = $1
        AND created_at >= date_trunc('month', now())
    `,
    [customerId],
  );
  return result.rows[0] ?? { requestCount: 0, tokenCount: 0 };
}

async function recordUsage(req: Request, status: string, latencyMs: number, error?: string): Promise<void> {
  if (!req.saasAuth) return;
  try {
    const pool = await getPool();
    await pool.query(
      `
        INSERT INTO usage_events (
          api_key_id, customer_id, subscription_id, requested_model,
          resolved_platform, resolved_model, status, latency_ms, error
        )
        VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8)
      `,
      [
        req.saasAuth.apiKeyId,
        req.saasAuth.customerId,
        req.saasAuth.subscriptionId,
        req.saasAuth.originalModel,
        req.saasAuth.resolvedModel,
        status,
        latencyMs,
        error ?? null,
      ],
    );
  } catch (err) {
    console.warn(`[saas] usage logging failed: ${err instanceof Error ? err.message : err}`);
  }
}

export async function requireSaasAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!isSaasMode()) {
    next();
    return;
  }

  const startedAt = Date.now();
  const token = extractBearerOrApiKey(req);
  if (!token) {
    res.status(401).json({ error: { message: 'Missing API key', type: 'authentication_error' } });
    return;
  }

  try {
    const pool = await getPool();
    const key = await loadApiKey(pool, token);
    if (!key) {
      res.status(401).json({ error: { message: 'Invalid or inactive API key', type: 'authentication_error' } });
      return;
    }

    const access = classifyRequest(req);
    const allowedGroups = key.allowedModelGroups ?? [];
    if (!isGroupAllowed(access.group, allowedGroups)) {
      res.status(402).json({
        error: {
          message: `Your ${key.planName} plan does not include the '${access.group}' model group.`,
          type: 'billing_error',
          code: 'plan_required',
        },
      });
      return;
    }

    const usage = await loadCurrentUsage(pool, key.customerId);
    const requestCount = numberFromDb(usage.requestCount);
    if (key.monthlyRequestLimit > 0 && requestCount >= key.monthlyRequestLimit) {
      res.status(429).json({
        error: {
          message: `Monthly request limit reached for ${key.planName}. Upgrade your plan to continue.`,
          type: 'rate_limit_error',
          code: 'monthly_quota_exceeded',
        },
      });
      return;
    }

    if (access.rewrittenModel && req.method !== 'GET') {
      req.body = { ...(req.body as Record<string, unknown>), model: access.rewrittenModel };
    }

    req.saasAuth = {
      apiKeyId: key.apiKeyId,
      customerId: key.customerId,
      subscriptionId: key.subscriptionId,
      planSlug: key.planSlug,
      planName: key.planName,
      allowedModelGroups: allowedGroups,
      requestedModelGroup: access.group,
      originalModel: access.originalModel,
      resolvedModel: access.rewrittenModel,
    };

    const unifiedKey = getUnifiedApiKey();
    req.headers.authorization = `Bearer ${unifiedKey}`;
    req.headers['x-api-key'] = unifiedKey;

    res.on('finish', () => {
      const status = res.statusCode >= 200 && res.statusCode < 400 ? 'success' : 'error';
      void recordUsage(req, status, Date.now() - startedAt, status === 'error' ? `HTTP ${res.statusCode}` : undefined);
    });

    next();
  } catch (err) {
    res.status(503).json({
      error: {
        message: `SaaS entitlement service unavailable: ${err instanceof Error ? err.message : 'unknown error'}`,
        type: 'server_error',
      },
    });
  }
}

