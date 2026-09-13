import { Pool } from "pg";

declare global {
  var __mobaPostgresPool: Pool | undefined;
}

export function postgresEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function postgresPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!globalThis.__mobaPostgresPool) {
    globalThis.__mobaPostgresPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
      max: 5,
    });
  }
  return globalThis.__mobaPostgresPool;
}

export async function ensureCollectionTable(): Promise<void> {
  await postgresPool().query(`
    CREATE TABLE IF NOT EXISTS collection_store (
      collection text PRIMARY KEY,
      payload jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}
