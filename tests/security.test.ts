import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

const env = process.env as Record<string, string | undefined>;

env.NODE_ENV = "test";
env.JWT_SECRET = "x".repeat(32);
env.DATA_ENCRYPTION_KEY = "y".repeat(32);
env.PAYLOAD_SIGNING_SECRET = "z".repeat(32);
env.CRON_SECRET = "c".repeat(24);
env.APP_BASE_URL = "http://localhost:3001";
env.ALLOWED_ORIGINS = "http://localhost:3001";
env.TRUST_PROXY_HEADERS = "true";

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

test("Body parser enforces UTF-8 byte limit", async () => {
  const { readJsonBody } = await import("../lib/server/body");
  const req = {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-type" ? "application/json" : null,
    },
    text: async () => JSON.stringify({ message: "😀".repeat(20) }),
  } as any;

  await assert.rejects(() =>
    readJsonBody(req, z.object({ message: z.string() }), 40)
  );
});

test("Admin user creation schema enforces strong password requirements", async () => {
  const { adminUserCreateSchema } = await import("../lib/server/validators");

  const weakWithUsername = adminUserCreateSchema.safeParse({
    username: "new-operator",
    password: "1234",
    role: "usuario",
  });
  const weakWithEmail = adminUserCreateSchema.safeParse({
    email: "operator@ford.local",
    password: "abcd",
    role: "analista",
  });
  const strongWithUsername = adminUserCreateSchema.safeParse({
    username: "new-operator",
    password: "StrongPassw0rd!",
    role: "usuario",
  });

  assert.equal(weakWithUsername.success, false);
  assert.equal(weakWithEmail.success, false);
  assert.equal(strongWithUsername.success, true);
});

test("Regular registration remains strict for non-admin flows", async () => {
  const { registerSchema } = await import("../lib/server/validators");

  const weakPassword = registerSchema.safeParse({
    username: "normal-user",
    email: "normal@ford.local",
    password: "1234",
  });

  assert.equal(weakPassword.success, false);
});

test("Login schema allows 4-char passwords for admin-created users", async () => {
  const { loginSchema } = await import("../lib/server/validators");

  const parsed = loginSchema.safeParse({
    identifier: "admin-user",
    password: "1234",
  });

  assert.equal(parsed.success, true);
});

test("Client IP parser only accepts valid forwarded IP values", async () => {
  const { getClientIp } = await import("../lib/server/request");

  const req = {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "x-forwarded-for"
          ? "unknown, 127.0.0.1:8080"
          : null,
    },
    ip: "10.0.0.5",
  } as any;

  assert.equal(getClientIp(req), "127.0.0.1");
});
