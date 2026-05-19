import { config } from "./config";
import { loadStore, saveStore } from "./secureStore";

type LoginGuardEntry = {
  count: number;
  firstAt: number;
  lockedUntil?: number;
  lastIp?: string;
};

type LoginGuardStore = {
  items: Record<string, LoginGuardEntry>;
};

const STORE_NAME = "login_guard";

function normalize(username: string) {
  return username.trim().toLowerCase();
}

function getStore() {
  return loadStore<LoginGuardStore>(STORE_NAME, { items: {} });
}

export async function checkLoginLock(username: string) {
  const key = normalize(username);
  const store = await getStore();
  const entry = store.items[key];
  if (!entry) return { locked: false };

  const now = Date.now();
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return { locked: true, lockedUntil: entry.lockedUntil };
  }

  if (now - entry.firstAt > config.loginGuard.windowMs) {
    delete store.items[key];
    await saveStore(STORE_NAME, store);
    return { locked: false };
  }

  return { locked: false };
}

export async function recordFailedLogin(username: string, ip?: string) {
  const key = normalize(username);
  const store = await getStore();
  const now = Date.now();
  let entry = store.items[key];

  if (!entry || now - entry.firstAt > config.loginGuard.windowMs) {
    entry = { count: 0, firstAt: now };
  }

  entry.count += 1;
  entry.lastIp = ip;

  if (entry.count >= config.loginGuard.maxAttempts) {
    entry.lockedUntil = now + config.loginGuard.lockMs;
  }

  store.items[key] = entry;
  await saveStore(STORE_NAME, store);

  return {
    locked: Boolean(entry.lockedUntil && entry.lockedUntil > now),
    lockedUntil: entry.lockedUntil,
  };
}

export async function clearLoginGuard(username: string) {
  const key = normalize(username);
  const store = await getStore();
  if (store.items[key]) {
    delete store.items[key];
    await saveStore(STORE_NAME, store);
  }
}
