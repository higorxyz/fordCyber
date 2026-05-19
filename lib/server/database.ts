import { Pool } from "pg";
import { config } from "./config";

let pool: Pool | null = null;
let schemaReadyPromise: Promise<void> | null = null;

declare global {
  var __fordVisionPool: Pool | undefined;
}

export function hasDatabase() {
  return config.databaseUrl.length > 0;
}

function getPool() {
  if (!hasDatabase()) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (!pool) {
    pool =
      global.__fordVisionPool ??
      new Pool({
        connectionString: config.databaseUrl,
        ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
        max: config.databaseMaxConnections,
      });
    global.__fordVisionPool = pool;
  }
  return pool;
}

export async function ensureDatabaseSchema() {
  if (!hasDatabase()) return;
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      const client = await getPool().connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS secure_store (
            name TEXT PRIMARY KEY,
            payload TEXT NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
      } finally {
        client.release();
      }
    })();
  }
  await schemaReadyPromise;
}

export async function querySingleValue<T>(
  text: string,
  params: unknown[]
): Promise<T | null> {
  const result = await getPool().query(text, params);
  if (result.rows.length === 0) return null;
  return result.rows[0] as T;
}

export async function queryRows<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}

export async function execute(text: string, params: unknown[]) {
  await getPool().query(text, params);
}
