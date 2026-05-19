import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "x".repeat(32);
process.env.DATA_ENCRYPTION_KEY = "y".repeat(32);
process.env.PAYLOAD_SIGNING_SECRET = "z".repeat(32);
process.env.CRON_SECRET = "c".repeat(24);
process.env.APP_BASE_URL = "http://localhost:3001";
process.env.ALLOWED_ORIGINS = "http://localhost:3001";

test("CSRF rejects mismatched token", async () => {
  const { requireCsrf } = await import("../lib/server/csrf");

  const req = {
    cookies: { get: () => ({ value: "token-a" }) },
    headers: { get: () => "token-b" },
  } as any;

  await assert.rejects(() => requireCsrf(req, "req-1"));
});

test("CORS allowlist matches origin", async () => {
  const { isAllowedOrigin } = await import("../lib/server/http");
  assert.equal(isAllowedOrigin("http://localhost:3001"), true);
  assert.equal(isAllowedOrigin("https://evil.test"), false);
});

test("Rate limit blocks after threshold", async () => {
  const { rateLimit } = await import("../lib/server/rateLimit");
  const key = `rate:test:${Date.now()}`;
  const first = await rateLimit(key, 2, 60_000);
  const second = await rateLimit(key, 2, 60_000);
  const third = await rateLimit(key, 2, 60_000);
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
});

test("RBAC allows higher roles", async () => {
  const { roleAllows, signAccessToken, verifyAccessToken } = await import(
    "../lib/server/auth"
  );
  const user = {
    id: "user-1",
    username: "admin",
    email: "admin@ford.local",
    role: "admin",
    passwordHash: "hash",
    createdAt: new Date().toISOString(),
  };
  const token = await signAccessToken(user as any, "session-1");
  const session = await verifyAccessToken(token);
  assert.equal(session.userId, "user-1");
  assert.equal(session.sessionId, "session-1");
  assert.equal(roleAllows("admin", "analista"), true);
  assert.equal(roleAllows("usuario", "analista"), false);
});

test("Password reset token is single-use", async () => {
  const { createPasswordReset, consumePasswordReset } = await import(
    "../lib/server/passwordReset"
  );
  const created = await createPasswordReset({ userId: "user-1" });
  const first = await consumePasswordReset(created.token);
  const second = await consumePasswordReset(created.token);
  assert.equal(first?.userId, "user-1");
  assert.equal(second, null);
});
