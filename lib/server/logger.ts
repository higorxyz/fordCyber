import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import type { AuditEvent, Role, Store } from "./models";
import { loadStore, purgeStore, saveStore, secureDeleteFile } from "./secureStore";

type LogEventInput = {
  type: string;
  actorId?: string;
  actorRole?: Role;
  requestId: string;
  ip?: string;
  details?: Record<string, unknown>;
};

const STORE_NAME = "audit_events";
const LEGACY_AUDIT_LOG_PATH = path.join(process.cwd(), "data", "secure", "audit.log");
const MAX_EVENTS = 10_000;
const MAX_DETAILS_DEPTH = 6;
const MAX_DETAILS_KEYS = 80;
const MAX_DETAILS_ARRAY_ITEMS = 30;
const MAX_STRING_LENGTH = 280;
const REDACTED_VALUE = "[redacted]";
const TRUNCATED_VALUE = "[truncated]";
const SENSITIVE_KEY_PATTERN =
  /(pass(word)?|token|secret|authorization|cookie|session|credential|api[-_]?key|email|phone|cpf|cnpj|vin|plate|license|username|customer(name|email|phone)?|notes?)/i;

let migrationPromise: Promise<void> | null = null;
let migrationCompleted = false;
let writeQueue: Promise<void> = Promise.resolve();

export async function logEvent(input: LogEventInput) {
  const event = buildAuditEvent(input);
  emitStructuredConsole("info", event);

  try {
    await ensureLegacyAuditMigration();
    await enqueuePersist(async () => {
      const store = await loadStore<Store<AuditEvent>>(STORE_NAME, { items: [] });
      store.items.unshift(event);
      if (store.items.length > MAX_EVENTS) {
        store.items = store.items.slice(0, MAX_EVENTS);
      }
      await saveStore(STORE_NAME, store);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (isStoreCorruptionError(error)) {
      await resetAuditStore([event]);
      emitStructuredConsole("info", {
        type: "audit_storage_recovered",
        requestId: event.requestId,
        details: {
          originalType: event.type,
        },
      });
      return;
    }

    emitStructuredConsole("error", {
      type: "audit_storage_error",
      requestId: event.requestId,
      details: {
        originalType: event.type,
        message,
      },
    });
  }
}

export async function getAuditEvents(limit: number) {
  await ensureLegacyAuditMigration();
  let store: Store<AuditEvent>;
  try {
    store = await loadStore<Store<AuditEvent>>(STORE_NAME, { items: [] });
  } catch (error) {
    emitStructuredConsole("error", {
      type: "audit_read_storage_error",
      requestId: "audit_read",
      details: {
        message: error instanceof Error ? error.message : "Unexpected error",
      },
    });
    if (isStoreCorruptionError(error)) {
      await resetAuditStore();
    }
    store = { items: [] };
  }
  const safeLimit = normalizeLimit(limit);
  return store.items
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, safeLimit);
}

async function resetAuditStore(seed: AuditEvent[] = []) {
  try {
    await enqueuePersist(async () => {
      await purgeStore(STORE_NAME);
      await saveStore(STORE_NAME, { items: seed.slice(0, MAX_EVENTS) });
    });
  } catch {
    // Recovery is best-effort; keep request flow alive.
  }
}

function isStoreCorruptionError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /unable to authenticate data|unsupported state/i.test(error.message);
}

function normalizeLimit(limit: number) {
  if (!Number.isFinite(limit)) return 50;
  const normalized = Math.trunc(limit);
  if (normalized < 1) return 1;
  if (normalized > 500) return 500;
  return normalized;
}

function enqueuePersist(task: () => Promise<void>) {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

function buildAuditEvent(input: LogEventInput): AuditEvent {
  const type = normalizeType(input.type);
  const requestId = normalizeText(input.requestId, 120) || "unknown_request";
  const actorId = normalizeText(input.actorId, 120);
  const ip = normalizeIp(input.ip);
  const actorRole = normalizeRole(input.actorRole);
  const details = sanitizeDetails(input.details);

  return {
    id: nanoid(),
    type,
    actorId,
    actorRole,
    requestId,
    ip,
    createdAt: new Date().toISOString(),
    details,
  };
}

function normalizeType(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return normalized.length > 0 ? normalized.slice(0, 80) : "unknown_event";
}

function normalizeText(value: string | undefined, maxLength: number) {
  if (!value) return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) return undefined;
  return normalized.slice(0, maxLength);
}

function normalizeIp(value: string | undefined) {
  return normalizeText(value, 64);
}

function normalizeRole(role: Role | undefined) {
  if (role === "admin" || role === "analista" || role === "usuario") {
    return role;
  }
  return undefined;
}

function sanitizeDetails(details: Record<string, unknown> | undefined) {
  if (!details) return undefined;
  const sanitized = sanitizeValue(details, 1);
  if (!isPlainObject(sanitized)) return undefined;
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > MAX_DETAILS_DEPTH) return TRUNCATED_VALUE;

  if (value === null) return null;
  if (typeof value === "string") return normalizeString(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : TRUNCATED_VALUE;
  if (typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_DETAILS_ARRAY_ITEMS).map((item) => sanitizeValue(item, depth + 1));
    if (value.length > MAX_DETAILS_ARRAY_ITEMS) {
      items.push(TRUNCATED_VALUE);
    }
    return items;
  }

  if (!isPlainObject(value)) {
    return normalizeString(String(value));
  }

  const output: Record<string, unknown> = {};
  let count = 0;
  for (const [key, rawValue] of Object.entries(value)) {
    if (count >= MAX_DETAILS_KEYS) {
      output.__truncated = true;
      break;
    }
    count += 1;
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      output[key] = REDACTED_VALUE;
      continue;
    }
    const sanitized = sanitizeValue(rawValue, depth + 1);
    if (sanitized !== undefined) {
      output[key] = sanitized;
    }
  }
  return output;
}

function normalizeString(value: string) {
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (collapsed.length <= MAX_STRING_LENGTH) {
    return collapsed;
  }
  return `${collapsed.slice(0, MAX_STRING_LENGTH)} ${TRUNCATED_VALUE}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function ensureLegacyAuditMigration() {
  if (migrationCompleted) {
    return Promise.resolve();
  }

  if (!migrationPromise) {
    migrationPromise = migrateLegacyAuditLog()
      .then(() => {
        migrationCompleted = true;
      })
      .catch(async (error) => {
        if (isStoreCorruptionError(error)) {
          await resetAuditStore();
          return;
        }
        throw error;
      })
      .finally(() => {
        migrationPromise = null;
      });
  }
  return migrationPromise;
}

async function migrateLegacyAuditLog() {
  if (!fs.existsSync(LEGACY_AUDIT_LOG_PATH)) return;

  const raw = fs.readFileSync(LEGACY_AUDIT_LOG_PATH, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    secureDeleteFile(LEGACY_AUDIT_LOG_PATH);
    return;
  }

  const migratedEvents: AuditEvent[] = [];
  for (const line of lines) {
    const event = parseLegacyLine(line);
    if (event) {
      migratedEvents.push(event);
    }
  }

  if (migratedEvents.length > 0) {
    await enqueuePersist(async () => {
      const store = await loadStore<Store<AuditEvent>>(STORE_NAME, { items: [] });
      store.items.unshift(...migratedEvents);
      if (store.items.length > MAX_EVENTS) {
        store.items = store.items.slice(0, MAX_EVENTS);
      }
      await saveStore(STORE_NAME, store);
    });
  }

  secureDeleteFile(LEGACY_AUDIT_LOG_PATH);
}

function parseLegacyLine(line: string): AuditEvent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }

  if (!isPlainObject(parsed) || typeof parsed.type !== "string") {
    return null;
  }

  const requestId =
    typeof parsed.requestId === "string" && parsed.requestId.trim().length > 0
      ? parsed.requestId
      : "legacy_migration";

  const details = isPlainObject(parsed.details) ? parsed.details : undefined;
  const candidateRole = typeof parsed.actorRole === "string" ? parsed.actorRole : undefined;
  const role =
    candidateRole === "admin" || candidateRole === "analista" || candidateRole === "usuario"
      ? candidateRole
      : undefined;

  return {
    id: typeof parsed.id === "string" && parsed.id.trim().length > 0 ? parsed.id : nanoid(),
    type: normalizeType(parsed.type),
    actorId: typeof parsed.actorId === "string" ? normalizeText(parsed.actorId, 120) : undefined,
    actorRole: role,
    requestId: normalizeText(requestId, 120) ?? "legacy_migration",
    ip: typeof parsed.ip === "string" ? normalizeIp(parsed.ip) : undefined,
    createdAt:
      typeof parsed.createdAt === "string" && Number.isFinite(Date.parse(parsed.createdAt))
        ? parsed.createdAt
        : new Date().toISOString(),
    details: sanitizeDetails(details),
  };
}

function emitStructuredConsole(level: "info" | "error", payload: Record<string, unknown>) {
  const body = {
    level,
    timestamp: new Date().toISOString(),
    ...payload,
  };
  const line = JSON.stringify(body);
  if (level === "error") {
    console.error(line);
    return;
  }
  console.info(line);
}
