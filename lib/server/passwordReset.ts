import crypto from "crypto";
import { nanoid } from "nanoid";
import { config } from "./config";
import { execute, hasDatabase, queryRows, querySingleValue } from "./database";
import { hashToken } from "./crypto";
import { loadStore, saveStore } from "./secureStore";
import type { PasswordReset, Store } from "./models";

type ResetRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  requested_ip: string | null;
  requested_user_agent: string | null;
};

type ResetStore = Store<PasswordReset>;

const STORE_NAME = "password_resets";
let resetsSchemaReady: Promise<void> | null = null;

function normalizeText(value: string | undefined, maxLength: number) {
  if (!value) return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  return normalized.slice(0, maxLength);
}

async function ensureResetsSchema() {
  if (!hasDatabase()) return;
  if (!resetsSchemaReady) {
    resetsSchemaReady = execute(
      `
      CREATE TABLE IF NOT EXISTS password_resets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        requested_ip TEXT,
        requested_user_agent TEXT
      )
      `,
      []
    );
  }
  await resetsSchemaReady;
}

async function loadFallbackStore() {
  return loadStore<ResetStore>(STORE_NAME, { items: [] });
}

async function saveFallbackStore(store: ResetStore) {
  await saveStore(STORE_NAME, store);
}

function pruneExpired(store: ResetStore, now = Date.now()) {
  const before = store.items.length;
  store.items = store.items.filter((item) => Date.parse(item.expiresAt) > now && !item.usedAt);
  return store.items.length !== before;
}

export async function createPasswordReset(input: {
  userId: string;
  requestedIp?: string;
  requestedUserAgent?: string;
}) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + config.passwordResetTtlMinutes * 60_000
  ).toISOString();
  const requestedIp = normalizeText(input.requestedIp, 64);
  const requestedUserAgent = normalizeText(input.requestedUserAgent, 280);

  if (hasDatabase()) {
    await ensureResetsSchema();
    await execute(
      `
      INSERT INTO password_resets (
        id, user_id, token_hash, expires_at, created_at, requested_ip, requested_user_agent
      )
      VALUES ($1, $2, $3, $4, NOW(), $5, $6)
      `,
      [nanoid(), input.userId, tokenHash, expiresAt, requestedIp ?? null, requestedUserAgent ?? null]
    );
    return { token, expiresAt };
  }

  const store = await loadFallbackStore();
  pruneExpired(store);
  store.items.push({
    id: nanoid(),
    userId: input.userId,
    tokenHash,
    expiresAt,
    createdAt: new Date().toISOString(),
    requestedIp,
    requestedUserAgent,
  });
  await saveFallbackStore(store);
  return { token, expiresAt };
}

export async function consumePasswordReset(token: string): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(token);
  const now = Date.now();

  if (hasDatabase()) {
    await ensureResetsSchema();
    const row = await querySingleValue<ResetRow>(
      `
      SELECT id, user_id, token_hash, expires_at, used_at
      FROM password_resets
      WHERE token_hash = $1
      `,
      [tokenHash]
    );
    if (!row) return null;
    if (row.used_at) return null;
    if (Date.parse(row.expires_at) <= now) return null;
    const updated = await queryRows<{ user_id: string }>(
      `
      UPDATE password_resets
      SET used_at = NOW()
      WHERE id = $1 AND used_at IS NULL
      RETURNING user_id
      `,
      [row.id]
    );
    if (!updated[0]) return null;
    return { userId: updated[0].user_id };
  }

  const store = await loadFallbackStore();
  pruneExpired(store, now);
  const target = store.items.find((item) => item.tokenHash === tokenHash);
  if (!target || target.usedAt) return null;
  if (Date.parse(target.expiresAt) <= now) return null;
  target.usedAt = new Date().toISOString();
  await saveFallbackStore(store);
  return { userId: target.userId };
}

export async function clearPasswordResetsForUser(userId: string) {
  if (hasDatabase()) {
    await ensureResetsSchema();
    await execute("DELETE FROM password_resets WHERE user_id = $1", [userId]);
    return;
  }

  const store = await loadFallbackStore();
  const before = store.items.length;
  store.items = store.items.filter((item) => item.userId !== userId);
  if (store.items.length !== before) {
    await saveFallbackStore(store);
  }
}
