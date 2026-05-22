import assert from "node:assert/strict";
import test from "node:test";
import type { NextRequest } from "next/server";
import { z } from "zod";
import type { User, Vehicle } from "../lib/server/models";

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
  } as unknown as NextRequest;

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
  const user: User = {
    id: "user-1",
    username: "admin",
    email: "admin@ford.local",
    role: "admin",
    passwordHash: "hash",
    createdAt: new Date().toISOString(),
  };
  const token = await signAccessToken(user, "session-1");
  const session = await verifyAccessToken(token);
  assert.equal(session.userId, "user-1");
  assert.equal(session.sessionId, "session-1");
  assert.equal(roleAllows("admin", "analista"), true);
  assert.equal(roleAllows("usuario", "analista"), false);
});

test("Refresh cookie is scoped and legacy cookie name is deprecated", async () => {
  const {
    REFRESH_COOKIE,
    LEGACY_REFRESH_COOKIE,
    REFRESH_COOKIE_PATH,
  } = await import("../lib/server/auth");

  assert.notEqual(REFRESH_COOKIE, LEGACY_REFRESH_COOKIE);
  assert.equal(REFRESH_COOKIE_PATH, "/api/auth/refresh");
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
  } as unknown as NextRequest;

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
  } as unknown as NextRequest;

  assert.equal(getClientIp(req), "127.0.0.1");
});

test("Payload signature validates content and timestamp", async () => {
  const { signPayload, verifyPayloadSignature } = await import("../lib/server/signature");

  const body = JSON.stringify({ event: "lead_created", id: "lead-1" });
  const timestamp = Date.now().toString();
  const signature = signPayload(body, timestamp);

  assert.equal(verifyPayloadSignature(body, signature, timestamp), true);
  assert.equal(
    verifyPayloadSignature(JSON.stringify({ event: "tampered", id: "lead-1" }), signature, timestamp),
    false
  );
  assert.equal(
    verifyPayloadSignature(body, signature, (Date.now() - 10 * 60_000).toString()),
    false
  );
});

test("Encrypted payload roundtrip works and tampering is rejected", async () => {
  const { decryptJson, encryptJson } = await import("../lib/server/crypto");

  const sample = {
    userId: "user-123",
    role: "analista",
    meta: { attempts: 3, ok: true },
  };
  const payload = encryptJson(sample);
  const decoded = decryptJson<typeof sample>(payload);
  assert.deepEqual(decoded, sample);

  const [iv, data, tag] = payload.split(".");
  assert.ok(iv && data && tag);
  const suffix = data.endsWith("AA") ? "BB" : "AA";
  const tamperedData = `${data.slice(0, -2)}${suffix}`;
  const tampered = `${iv}.${tamperedData}.${tag}`;
  assert.throws(() => decryptJson(tampered));
});

test("Vehicle retention anonymizes and removes old records", async () => {
  const { applyVehicleRetention } = await import("../lib/server/retention");

  const now = Date.now();
  const isoDaysAgo = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
  const vehicles: Vehicle[] = [
    {
      id: "veh-new",
      vin: "1HGCM82633A004352",
      marca: "FORD",
      modelo: "RANGER",
      versao: "XLT",
      atributos: { combustivel: "diesel" },
      createdAt: isoDaysAgo(10),
    },
    {
      id: "veh-old",
      vin: "1HGCM82633A004353",
      marca: "FORD",
      modelo: "MAVERICK",
      versao: "LARIAT",
      atributos: { combustivel: "hibrido" },
      createdAt: isoDaysAgo(40),
    },
    {
      id: "veh-very-old",
      vin: "1HGCM82633A004354",
      marca: "FORD",
      modelo: "BRONCO",
      versao: "WILDTRAK",
      atributos: { combustivel: "gasolina" },
      createdAt: isoDaysAgo(80),
    },
  ];

  const result = applyVehicleRetention(vehicles, 30);
  assert.equal(result.anonymized, 1);
  assert.equal(result.removed, 1);
  assert.equal(result.kept.length, 2);

  const anonymized = result.kept.find((vehicle) => vehicle.id === "veh-old");
  const recent = result.kept.find((vehicle) => vehicle.id === "veh-new");
  assert.ok(anonymized);
  assert.ok(recent);
  assert.ok(anonymized?.vin.startsWith("ANONVIN-"));
  assert.equal(recent?.vin, "1HGCM82633A004352");
});
