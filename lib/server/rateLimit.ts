import { config } from "./config";
import { loadStore, saveStore } from "./secureStore";

type Bucket = {
  count: number;
  resetAt: number;
  violations: number;
  throttledUntil?: number;
  lastSeenAt: number;
};

type RateLimitStore = {
  items: Record<string, Bucket>;
};

const STORE_NAME = "rate_limits";

function getStore() {
  return loadStore<RateLimitStore>(STORE_NAME, { items: {} });
}

function persistStore(store: RateLimitStore) {
  return saveStore(STORE_NAME, store);
}

export async function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const store = await getStore();
  await pruneExpiredBuckets(store, now);

  let bucket = store.items[key];
  if (
    bucket &&
    typeof bucket.throttledUntil === "number" &&
    Number.isFinite(bucket.throttledUntil) &&
    bucket.throttledUntil > now
  ) {
    bucket.lastSeenAt = now;
    store.items[key] = bucket;
    await persistStore(store);
    return {
      allowed: false,
      remaining: 0,
      resetAt: bucket.throttledUntil,
      retryAfterSec: Math.ceil((bucket.throttledUntil - now) / 1000),
    };
  }

  if (!bucket || bucket.resetAt <= now) {
    bucket = {
      count: 0,
      resetAt: now + windowMs,
      violations: bucket?.violations ?? 0,
      lastSeenAt: now,
    };
  }

  if (bucket.count >= limit) {
    const violations = Math.min((bucket.violations ?? 0) + 1, 10);
    const throttleMs = Math.min(
      config.rateLimits.throttle.maxMs,
      config.rateLimits.throttle.baseMs * 2 ** Math.max(0, violations - 1)
    );
    const throttledUntil = now + throttleMs;

    store.items[key] = {
      ...bucket,
      violations,
      resetAt: throttledUntil,
      throttledUntil,
      lastSeenAt: now,
    };
    await persistStore(store);

    return {
      allowed: false,
      remaining: 0,
      resetAt: throttledUntil,
      retryAfterSec: Math.ceil(throttleMs / 1000),
    };
  }

  const nextBucket: Bucket = {
    ...bucket,
    count: bucket.count + 1,
    resetAt: bucket.resetAt,
    violations: bucket.violations,
    throttledUntil: undefined,
    lastSeenAt: now,
  };
  store.items[key] = nextBucket;
  await persistStore(store);

  return {
    allowed: true,
    remaining: Math.max(0, limit - nextBucket.count),
    resetAt: nextBucket.resetAt,
    retryAfterSec: 0,
  };
}

export async function cleanupRateLimits() {
  const store = await getStore();
  await pruneExpiredBuckets(store, Date.now());
  await persistStore(store);
}

async function pruneExpiredBuckets(store: RateLimitStore, now: number) {
  let changed = false;
  const ttlMs = config.rateLimits.throttle.ttlMs;

  for (const [key, bucket] of Object.entries(store.items)) {
    const reference = Math.max(
      bucket.resetAt || 0,
      bucket.throttledUntil || 0,
      bucket.lastSeenAt || 0
    );
    if (reference + ttlMs <= now) {
      delete store.items[key];
      changed = true;
    }
  }

  if (changed) {
    await persistStore(store);
  }
}
