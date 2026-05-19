import crypto from "crypto";
import fs from "fs";
import path from "path";
import { decryptJson, encryptJson } from "./crypto";
import { ensureDatabaseSchema, execute, hasDatabase, querySingleValue } from "./database";

const DATA_DIR = path.join(process.cwd(), "data", "secure");
const cache = new Map<string, unknown>();

function assertPersistentBackend() {
  const runningOnVercel = process.env.VERCEL === "1";
  const production = process.env.NODE_ENV === "production";
  if (runningOnVercel && production && !hasDatabase()) {
    throw new Error("DATABASE_URL is required in Vercel production for secure storage");
  }
}

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function storePath(name: string) {
  return path.join(DATA_DIR, `${name}.enc`);
}

export async function loadStore<T>(name: string, fallback: T): Promise<T> {
  assertPersistentBackend();
  if (cache.has(name)) return cache.get(name) as T;

  if (hasDatabase()) {
    const value = await loadStoreFromDatabase(name, fallback);
    cache.set(name, value);
    return value;
  }

  const value = loadStoreFromFile(name, fallback);
  cache.set(name, value);
  return value;
}

export async function saveStore<T>(name: string, value: T) {
  assertPersistentBackend();
  if (hasDatabase()) {
    await ensureDatabaseSchema();
    await execute(
      `
        INSERT INTO secure_store (name, payload, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (name)
        DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
      `,
      [name, encryptJson(value)]
    );
    cache.set(name, value);
    return;
  }

  ensureDir();
  const filePath = storePath(name);
  const payload = encryptJson(value);
  fs.writeFileSync(filePath, payload, "utf8");
  cache.set(name, value);
}

export async function purgeStore(name: string) {
  assertPersistentBackend();
  if (hasDatabase()) {
    await ensureDatabaseSchema();
    await execute("DELETE FROM secure_store WHERE name = $1", [name]);
    cache.delete(name);
    return;
  }

  const filePath = storePath(name);
  secureDeleteFile(filePath);
  cache.delete(name);
}

function loadStoreFromFile<T>(name: string, fallback: T): T {
  ensureDir();
  const filePath = storePath(name);
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) {
    return fallback;
  }
  return decryptJson<T>(raw);
}

async function loadStoreFromDatabase<T>(name: string, fallback: T): Promise<T> {
  await ensureDatabaseSchema();
  const row = await querySingleValue<{ payload: string }>(
    "SELECT payload FROM secure_store WHERE name = $1",
    [name]
  );
  if (row?.payload) {
    return decryptJson<T>(row.payload);
  }

  const migrated = migrateStoreFromFileIfPresent<T>(name);
  if (migrated !== null) {
    await saveStore<T>(name, migrated);
    const filePath = storePath(name);
    secureDeleteFile(filePath);
    return migrated;
  }

  return fallback;
}

function migrateStoreFromFileIfPresent<T>(name: string): T | null {
  const filePath = storePath(name);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return null;
  return decryptJson<T>(raw);
}

export function secureDeleteFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    fs.rmSync(filePath, { recursive: true, force: true });
    return;
  }

  const size = stat.size;
  if (size <= 0) {
    fs.unlinkSync(filePath);
    return;
  }

  const fd = fs.openSync(filePath, "r+");
  try {
    const chunkSize = 64 * 1024;
    const maxChunk = Math.min(chunkSize, size);
    const zeroChunk = Buffer.alloc(maxChunk, 0);

    let offset = 0;
    while (offset < size) {
      const remaining = size - offset;
      const length = Math.min(maxChunk, remaining);
      const randomBytes = crypto.randomBytes(length);
      fs.writeSync(fd, randomBytes, 0, length, offset);
      offset += length;
    }
    fs.fsyncSync(fd);

    offset = 0;
    while (offset < size) {
      const remaining = size - offset;
      const length = Math.min(zeroChunk.length, remaining);
      fs.writeSync(fd, zeroChunk, 0, length, offset);
      offset += length;
    }
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  fs.unlinkSync(filePath);
}
