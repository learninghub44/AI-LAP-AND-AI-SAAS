/**
 * SaaS Postgres DB initialiser.
 * Runs the schema SQL on startup when SAAS_MODE=1.
 * Safe to run multiple times (all statements use IF NOT EXISTS / ON CONFLICT).
 */
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

export async function initSaasDb(): Promise<void> {
  if (process.env.SAAS_MODE !== '1') return;
  console.log('[saas-db] Initialising SaaS schema on Postgres...');
  try {
    const pg = await getSaasPool();
    // Schema file is 3 levels up from dist/services/ → project root → supabase/
    const schemaPath = path.resolve(__dirname, '../../../supabase/saas_schema.sql');
    const sql = await readFile(schemaPath, 'utf-8');
    await pg.query(sql);
    console.log('[saas-db] Schema ready ✓');
  } catch (err) {
    console.error('[saas-db] Schema init failed:', err instanceof Error ? err.message : err);
    // Don't crash — server still usable, just SaaS routes will fail gracefully
  }
}
