/* eslint-disable @typescript-eslint/no-require-imports */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const MIGRATIONS_DIR = path.join(process.cwd(), "sql", "migrations");
const MIGRATION_TABLE = "schema_migrations";
const MIGRATION_LOCK_KEY = 908154733;

function parseBoolean(value, fallback) {
  if (!value) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  return fallback;
}

function parseOptionalEnv(name) {
  const value = process.env[name];
  if (!value) return "";
  return value.trim();
}

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function wasMigrationApplied(client, id) {
  const result = await client.query(
    `SELECT checksum FROM ${MIGRATION_TABLE} WHERE id = $1`,
    [id]
  );
  if (result.rowCount === 0) return null;
  return result.rows[0].checksum;
}

function fileChecksum(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  return {
    sql: content,
    checksum: crypto.createHash("sha256").update(content).digest("hex"),
  };
}

async function applyMigration(client, id, sql, checksum) {
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query(
      `INSERT INTO ${MIGRATION_TABLE} (id, checksum) VALUES ($1, $2)`,
      [id, checksum]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run migrations");
  }

  const databaseSsl = parseBoolean(process.env.DATABASE_SSL, true);
  const databaseSslRejectUnauthorized = parseBoolean(
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED,
    true
  );
  const databaseSslCa = parseOptionalEnv("DATABASE_SSL_CA").replace(/\\n/g, "\n");
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && databaseSsl && !databaseSslRejectUnauthorized) {
    throw new Error(
      "Invalid env DATABASE_SSL_REJECT_UNAUTHORIZED: must be true in production"
    );
  }

  const ssl = databaseSsl
    ? {
        rejectUnauthorized: databaseSslRejectUnauthorized,
        ...(databaseSslCa ? { ca: databaseSslCa } : {}),
      }
    : false;

  const files = getMigrationFiles();
  if (files.length === 0) {
    console.info("No SQL migrations found.");
    return;
  }

  const client = new Client({ connectionString, ssl });
  await client.connect();

  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    await ensureMigrationTable(client);

    for (const fileName of files) {
      const filePath = path.join(MIGRATIONS_DIR, fileName);
      const { sql, checksum } = fileChecksum(filePath);
      const existingChecksum = await wasMigrationApplied(client, fileName);

      if (existingChecksum) {
        if (existingChecksum !== checksum) {
          throw new Error(
            `Migration checksum mismatch for ${fileName}. Create a new migration instead of editing existing ones.`
          );
        }
        console.info(`Skipping ${fileName} (already applied).`);
        continue;
      }

      console.info(`Applying ${fileName}...`);
      await applyMigration(client, fileName, sql, checksum);
      console.info(`Applied ${fileName}.`);
    }
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
    } catch {
    }
    await client.end();
  }
}

run().catch((error) => {
  console.error(`Migration failed: ${error instanceof Error ? error.message : "Unexpected error"}`);
  process.exit(1);
});
