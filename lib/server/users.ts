import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { config } from "./config";
import { execute, hasDatabase, queryRows, querySingleValue } from "./database";
import { loadStore, saveStore } from "./secureStore";
import type { Role, Store, User } from "./models";

type UserRow = {
  id: string;
  username: string;
  email: string;
  name: string | null;
  role: Role;
  password_hash: string;
  refresh_token_hash: string | null;
  created_at: string;
  updated_at: string;
};

type CreateUserInput = {
  username: string;
  email: string;
  passwordHash: string;
  role: Role;
  name?: string;
};

const USERS_STORE = "users";
let usersSchemaReady: Promise<void> | null = null;

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeLoginIdentifier(value: string) {
  return value.trim().toLowerCase();
}

function mapRow(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    name: row.name ?? undefined,
    role: row.role,
    passwordHash: row.password_hash,
    refreshTokenHash: row.refresh_token_hash ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureUsersSchema() {
  if (!hasDatabase()) return;
  if (!usersSchemaReady) {
    usersSchemaReady = execute(
      `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        role TEXT NOT NULL CHECK (role IN ('usuario','analista','admin')),
        password_hash TEXT NOT NULL,
        refresh_token_hash TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `,
      []
    );
  }
  await usersSchemaReady;
}

async function loadFallbackStore() {
  return loadStore<Store<User>>(USERS_STORE, { items: [] });
}

async function saveFallbackStore(store: Store<User>) {
  return saveStore(USERS_STORE, store);
}

export async function ensureBootstrapUsers() {
  if (hasDatabase()) {
    await ensureUsersSchema();
    const count = await querySingleValue<{ total: number }>(
      "SELECT COUNT(*)::int AS total FROM users",
      []
    );
    if ((count?.total ?? 0) > 0) return;
    const migrated = await migrateLegacyStoreUsers();
    if (!migrated) {
      await seedBootstrapUsers();
    }
    return;
  }

  const store = await loadFallbackStore();
  if (store.items.length > 0) return;
  const seeded = await seedBootstrapUsers();
  store.items = seeded;
  await saveFallbackStore(store);
}

async function seedBootstrapUsers() {
  const now = new Date().toISOString();
  const bootstrapUsername = normalizeUsername(config.bootstrapAdminUsername);
  const bootstrapPassword = config.bootstrapAdminPassword.trim();
  const items: User[] = [];

  if (bootstrapUsername && bootstrapPassword) {
    if (bootstrapPassword.length < 12) {
      throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters");
    }
    items.push({
      id: nanoid(),
      username: bootstrapUsername,
      email: `${bootstrapUsername}@ford.local`,
      name: config.bootstrapAdminName,
      role: "admin",
      passwordHash: bcrypt.hashSync(bootstrapPassword, 10),
      createdAt: now,
      updatedAt: now,
    });
  }

  if (config.seedDemoUsers) {
    items.push(
      {
        id: nanoid(),
        username: "cliente",
        email: "cliente@ford.local",
        name: "Cliente Demo",
        role: "usuario",
        passwordHash: bcrypt.hashSync("cliente", 10),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        username: "analista",
        email: "analista@ford.local",
        name: "Analista Demo",
        role: "analista",
        passwordHash: bcrypt.hashSync("analista", 10),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        username: "gerente",
        email: "gerente@ford.local",
        name: "Gerente Demo",
        role: "admin",
        passwordHash: bcrypt.hashSync("gerente", 10),
        createdAt: now,
        updatedAt: now,
      }
    );
  }

  if (hasDatabase()) {
    for (const user of items) {
      await insertUserRecord({
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash: user.passwordHash,
      });
    }
  }

  return items;
}

export async function createUser(input: CreateUserInput): Promise<User | null> {
  await ensureBootstrapUsers();
  const username = normalizeUsername(input.username);
  const email = normalizeEmail(input.email);

  if (hasDatabase()) {
    return insertUserRecord({
      username,
      email,
      name: input.name,
      role: input.role,
      passwordHash: input.passwordHash,
    });
  }

  const store = await loadFallbackStore();
  if (store.items.some((u) => u.username === username || u.email === email)) {
    return null;
  }
  const user: User = {
    id: nanoid(),
    username,
    email,
    name: input.name,
    role: input.role,
    passwordHash: input.passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.items.push(user);
  await saveFallbackStore(store);
  return user;
}

async function insertUserRecord(input: CreateUserInput): Promise<User | null> {
  await ensureUsersSchema();
  const username = normalizeUsername(input.username);
  const email = normalizeEmail(input.email);
  const rows = await queryRows<UserRow>(
    `
    INSERT INTO users (id, username, email, name, role, password_hash, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    ON CONFLICT DO NOTHING
    RETURNING id, username, email, name, role, password_hash, refresh_token_hash, created_at, updated_at
    `,
    [nanoid(), username, email, input.name ?? null, input.role, input.passwordHash]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

async function migrateLegacyStoreUsers() {
  const legacyStore = await loadFallbackStore();
  if (legacyStore.items.length === 0) return false;
  for (const legacy of legacyStore.items) {
    const email =
      legacy.email && legacy.email.trim().length > 0
        ? legacy.email
        : `${legacy.username}@ford.local`;
    await insertUserRecord({
      username: legacy.username,
      email,
      name: legacy.name,
      role: legacy.role,
      passwordHash: legacy.passwordHash,
    });
  }
  return true;
}

export async function findUserById(userId: string): Promise<User | null> {
  await ensureBootstrapUsers();
  if (hasDatabase()) {
    const row = await querySingleValue<UserRow>(
      "SELECT id, username, email, name, role, password_hash, refresh_token_hash, created_at, updated_at FROM users WHERE id = $1",
      [userId]
    );
    return row ? mapRow(row) : null;
  }

  const store = await loadFallbackStore();
  return store.items.find((u) => u.id === userId) ?? null;
}

export async function findUserByUsername(username: string): Promise<User | null> {
  await ensureBootstrapUsers();
  const normalized = normalizeUsername(username);
  if (hasDatabase()) {
    const row = await querySingleValue<UserRow>(
      "SELECT id, username, email, name, role, password_hash, refresh_token_hash, created_at, updated_at FROM users WHERE username = $1",
      [normalized]
    );
    return row ? mapRow(row) : null;
  }

  const store = await loadFallbackStore();
  return store.items.find((u) => u.username === normalized) ?? null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  await ensureBootstrapUsers();
  const normalized = normalizeEmail(email);
  if (hasDatabase()) {
    const row = await querySingleValue<UserRow>(
      "SELECT id, username, email, name, role, password_hash, refresh_token_hash, created_at, updated_at FROM users WHERE email = $1",
      [normalized]
    );
    return row ? mapRow(row) : null;
  }

  const store = await loadFallbackStore();
  return store.items.find((u) => u.email === normalized) ?? null;
}

export async function findUserByIdentifier(identifier: string): Promise<User | null> {
  await ensureBootstrapUsers();
  const normalized = normalizeLoginIdentifier(identifier);
  if (hasDatabase()) {
    const row = await querySingleValue<UserRow>(
      "SELECT id, username, email, name, role, password_hash, refresh_token_hash, created_at, updated_at FROM users WHERE username = $1 OR email = $1",
      [normalized]
    );
    return row ? mapRow(row) : null;
  }

  const store = await loadFallbackStore();
  return (
    store.items.find((u) => u.username === normalized || u.email === normalized) ?? null
  );
}

export async function listUsers(limit = 50): Promise<User[]> {
  await ensureBootstrapUsers();
  const safeLimit = Math.max(1, Math.min(limit, 200));
  if (hasDatabase()) {
    const rows = await queryRows<UserRow>(
      "SELECT id, username, email, name, role, password_hash, refresh_token_hash, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1",
      [safeLimit]
    );
    return rows.map(mapRow);
  }

  const store = await loadFallbackStore();
  return store.items.slice().reverse().slice(0, safeLimit);
}

export async function updateUserRole(userId: string, role: Role): Promise<User | null> {
  await ensureBootstrapUsers();
  if (hasDatabase()) {
    const rows = await queryRows<UserRow>(
      `
      UPDATE users
      SET role = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, username, email, name, role, password_hash, refresh_token_hash, created_at, updated_at
      `,
      [role, userId]
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  const store = await loadFallbackStore();
  const target = store.items.find((u) => u.id === userId);
  if (!target) return null;
  target.role = role;
  target.updatedAt = new Date().toISOString();
  await saveFallbackStore(store);
  return target;
}

export async function countUsersByRole(role: Role): Promise<number> {
  await ensureBootstrapUsers();
  if (hasDatabase()) {
    const row = await querySingleValue<{ total: number }>(
      "SELECT COUNT(*)::int AS total FROM users WHERE role = $1",
      [role]
    );
    return row?.total ?? 0;
  }

  const store = await loadFallbackStore();
  return store.items.filter((u) => u.role === role).length;
}

export async function updateRefreshTokenHash(userId: string, hash: string | null) {
  await ensureBootstrapUsers();
  if (hasDatabase()) {
    await execute(
      "UPDATE users SET refresh_token_hash = $1, updated_at = NOW() WHERE id = $2",
      [hash, userId]
    );
    return;
  }

  const store = await loadFallbackStore();
  const target = store.items.find((u) => u.id === userId);
  if (target) {
    target.refreshTokenHash = hash ?? undefined;
    target.updatedAt = new Date().toISOString();
    await saveFallbackStore(store);
  }
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  await ensureBootstrapUsers();
  if (hasDatabase()) {
    const rows = await queryRows<UserRow>(
      `
      UPDATE users
      SET password_hash = $1, refresh_token_hash = NULL, updated_at = NOW()
      WHERE id = $2
      RETURNING id, username, email, name, role, password_hash, refresh_token_hash, created_at, updated_at
      `,
      [passwordHash, userId]
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  const store = await loadFallbackStore();
  const target = store.items.find((u) => u.id === userId);
  if (!target) return null;
  target.passwordHash = passwordHash;
  target.refreshTokenHash = undefined;
  target.updatedAt = new Date().toISOString();
  await saveFallbackStore(store);
  return target;
}
