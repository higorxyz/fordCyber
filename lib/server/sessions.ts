import { nanoid } from "nanoid";
import { execute, hasDatabase, queryRows, querySingleValue } from "./database";
import { loadStore, purgeStore, saveStore } from "./secureStore";
import type { Store, UserSession } from "./models";

type SessionRow = {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  user_agent: string | null;
  ip_address: string | null;
  device_label: string | null;
  created_at: string;
  last_seen_at: string;
  revoked_at: string | null;
};

type StoredSession = UserSession & { refreshTokenHash: string };

type SessionStore = Store<StoredSession>;

type CreateSessionInput = {
  sessionId?: string;
  userId: string;
  refreshTokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  deviceLabel?: string;
};

const STORE_NAME = "user_sessions";
const MAX_STORE_ITEMS = 2000;
let sessionsSchemaReady: Promise<void> | null = null;

function normalizeText(value: string | undefined, maxLength: number) {
  if (!value) return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  return normalized.slice(0, maxLength);
}

function mapRow(row: SessionRow): StoredSession {
  return {
    id: row.id,
    userId: row.user_id,
    refreshTokenHash: row.refresh_token_hash,
    userAgent: row.user_agent ?? undefined,
    ipAddress: row.ip_address ?? undefined,
    deviceLabel: row.device_label ?? undefined,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    revokedAt: row.revoked_at ?? undefined,
  };
}

async function ensureSessionsSchema() {
  if (!hasDatabase()) return;
  if (!sessionsSchemaReady) {
    sessionsSchemaReady = execute(
      `
      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_token_hash TEXT NOT NULL,
        user_agent TEXT,
        ip_address TEXT,
        device_label TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMPTZ
      )
      `,
      []
    );
  }
  await sessionsSchemaReady;
}

async function loadFallbackStore() {
  try {
    return await loadStore<SessionStore>(STORE_NAME, { items: [] });
  } catch (error) {
    if (!isStoreCorruptionError(error)) {
      throw error;
    }

    console.warn(
      `[sessions] failed to load encrypted store, resetting transient sessions: ${
        error instanceof Error ? error.message : "unknown_error"
      }`
    );
    try {
      await purgeStore(STORE_NAME);
      await saveStore(STORE_NAME, { items: [] });
    } catch {
      // Keep request flow alive with empty in-memory fallback.
    }
    return { items: [] };
  }
}

async function saveFallbackStore(store: SessionStore) {
  await saveStore(STORE_NAME, store);
}

function isStoreCorruptionError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /unable to authenticate data|unsupported state|invalid encrypted payload/i.test(
    error.message
  );
}

function pruneStore(store: SessionStore) {
  if (store.items.length <= MAX_STORE_ITEMS) return;
  const sorted = store.items
    .slice()
    .sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));
  store.items = sorted.slice(0, MAX_STORE_ITEMS);
}

export function generateSessionId() {
  return nanoid();
}

export async function createSession(input: CreateSessionInput): Promise<UserSession> {
  const sessionId = input.sessionId ?? generateSessionId();
  const userAgent = normalizeText(input.userAgent, 280);
  const ipAddress = normalizeText(input.ipAddress, 64);
  const deviceLabel = normalizeText(input.deviceLabel, 80);

  if (hasDatabase()) {
    await ensureSessionsSchema();
    const rows = await queryRows<SessionRow>(
      `
      INSERT INTO user_sessions (
        id, user_id, refresh_token_hash, user_agent, ip_address, device_label, created_at, last_seen_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, user_id, refresh_token_hash, user_agent, ip_address, device_label, created_at, last_seen_at, revoked_at
      `,
      [sessionId, input.userId, input.refreshTokenHash, userAgent ?? null, ipAddress ?? null, deviceLabel ?? null]
    );
    return stripHash(mapRow(rows[0]));
  }

  const store = await loadFallbackStore();
  const now = new Date().toISOString();
  const record: StoredSession = {
    id: sessionId,
    userId: input.userId,
    refreshTokenHash: input.refreshTokenHash,
    userAgent,
    ipAddress,
    deviceLabel,
    createdAt: now,
    lastSeenAt: now,
  };
  store.items.push(record);
  pruneStore(store);
  await saveFallbackStore(store);
  return stripHash(record);
}

export async function listSessionsForUser(userId: string): Promise<UserSession[]> {
  if (hasDatabase()) {
    await ensureSessionsSchema();
    const rows = await queryRows<SessionRow>(
      `
      SELECT id, user_id, refresh_token_hash, user_agent, ip_address, device_label, created_at, last_seen_at, revoked_at
      FROM user_sessions
      WHERE user_id = $1 AND revoked_at IS NULL
      ORDER BY last_seen_at DESC
      `,
      [userId]
    );
    return rows.map((row) => stripHash(mapRow(row)));
  }

  const store = await loadFallbackStore();
  return store.items
    .filter((session) => session.userId === userId && !session.revokedAt)
    .sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt))
    .map(stripHash);
}

export async function verifySessionRefreshToken(
  userId: string,
  sessionId: string,
  tokenHash: string
): Promise<boolean> {
  if (hasDatabase()) {
    await ensureSessionsSchema();
    const row = await querySingleValue<SessionRow>(
      `
      SELECT id, user_id, refresh_token_hash, revoked_at
      FROM user_sessions
      WHERE id = $1
      `,
      [sessionId]
    );
    if (!row || row.user_id !== userId || row.revoked_at) return false;
    if (row.refresh_token_hash !== tokenHash) return false;
    await queryRows(
      "UPDATE user_sessions SET last_seen_at = NOW() WHERE id = $1",
      [sessionId]
    );
    return true;
  }

  const store = await loadFallbackStore();
  const target = store.items.find((session) => session.id === sessionId);
  if (!target || target.userId !== userId || target.revokedAt) return false;
  if (target.refreshTokenHash !== tokenHash) return false;
  target.lastSeenAt = new Date().toISOString();
  await saveFallbackStore(store);
  return true;
}

export async function updateSessionRefreshToken(sessionId: string, tokenHash: string) {
  if (hasDatabase()) {
    await ensureSessionsSchema();
    await queryRows(
      `
      UPDATE user_sessions
      SET refresh_token_hash = $1, last_seen_at = NOW()
      WHERE id = $2 AND revoked_at IS NULL
      `,
      [tokenHash, sessionId]
    );
    return;
  }

  const store = await loadFallbackStore();
  const target = store.items.find((session) => session.id === sessionId);
  if (target && !target.revokedAt) {
    target.refreshTokenHash = tokenHash;
    target.lastSeenAt = new Date().toISOString();
    await saveFallbackStore(store);
  }
}

export async function revokeSession(sessionId: string) {
  if (hasDatabase()) {
    await ensureSessionsSchema();
    await queryRows(
      "UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL",
      [sessionId]
    );
    return;
  }

  const store = await loadFallbackStore();
  const target = store.items.find((session) => session.id === sessionId);
  if (target && !target.revokedAt) {
    target.revokedAt = new Date().toISOString();
    await saveFallbackStore(store);
  }
}

export async function revokeSessionForUser(userId: string, sessionId: string) {
  if (hasDatabase()) {
    await ensureSessionsSchema();
    const rows = await queryRows<{ id: string }>(
      `
      UPDATE user_sessions
      SET revoked_at = NOW()
      WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
      RETURNING id
      `,
      [sessionId, userId]
    );
    return Boolean(rows[0]);
  }

  const store = await loadFallbackStore();
  const target = store.items.find(
    (session) => session.id === sessionId && session.userId === userId
  );
  if (!target || target.revokedAt) return false;
  target.revokedAt = new Date().toISOString();
  await saveFallbackStore(store);
  return true;
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string) {
  if (hasDatabase()) {
    await ensureSessionsSchema();
    if (exceptSessionId) {
      await queryRows(
        `
        UPDATE user_sessions
        SET revoked_at = NOW()
        WHERE user_id = $1 AND revoked_at IS NULL AND id <> $2
        `,
        [userId, exceptSessionId]
      );
      return;
    }
    await queryRows(
      "UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
      [userId]
    );
    return;
  }

  const store = await loadFallbackStore();
  let changed = false;
  for (const session of store.items) {
    if (session.userId !== userId) continue;
    if (exceptSessionId && session.id === exceptSessionId) continue;
    if (!session.revokedAt) {
      session.revokedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) {
    await saveFallbackStore(store);
  }
}

export async function isSessionActive(userId: string, sessionId: string) {
  if (hasDatabase()) {
    await ensureSessionsSchema();
    const row = await querySingleValue<{ revoked_at: string | null }>(
      "SELECT revoked_at FROM user_sessions WHERE id = $1 AND user_id = $2",
      [sessionId, userId]
    );
    return Boolean(row && !row.revoked_at);
  }

  const store = await loadFallbackStore();
  const target = store.items.find(
    (session) => session.id === sessionId && session.userId === userId
  );
  return Boolean(target && !target.revokedAt);
}

function stripHash(session: StoredSession): UserSession {
  const { refreshTokenHash, ...rest } = session;
  void refreshTokenHash;
  return rest;
}
