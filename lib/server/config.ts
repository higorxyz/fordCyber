const isProd = process.env.NODE_ENV === "production";
const isVercel = process.env.VERCEL === "1";

function parseCsv(value: string | undefined, fallback: string[]) {
  if (!value) return fallback;
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  return fallback;
}

function parseNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseAllowedOrigins(value: string | undefined) {
  const parsed = parseCsv(value, []);
  if (parsed.length > 0) return parsed;
  return isProd ? [] : ["http://localhost:3001"];
}

function parseOptionalEnv(name: string) {
  const value = process.env[name];
  if (!value) return "";
  return value.trim();
}

function requireEnv(name: string, fallback: string) {
  const value = process.env[name];
  if (value && value.trim().length > 0) return value.trim();
  if (isProd) throw new Error(`Missing required env: ${name}`);
  return fallback;
}

function requireSecret(name: string, fallback: string, minLength: number) {
  const value = requireEnv(name, fallback);
  if (isProd && value.length < minLength) {
    throw new Error(`Invalid env ${name}: minimum length is ${minLength}`);
  }
  return value;
}

const seedDemoUsers = parseBoolean(process.env.SEED_DEMO_USERS, !isProd);
const bootstrapAdminUsername = parseOptionalEnv("BOOTSTRAP_ADMIN_USERNAME");
const bootstrapAdminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";
const bootstrapAdminName = parseOptionalEnv("BOOTSTRAP_ADMIN_NAME") || "Administrador";
const appBaseUrl = parseOptionalEnv("APP_BASE_URL") || (isProd ? "" : "http://localhost:3001");
const databaseSsl = parseBoolean(process.env.DATABASE_SSL, true);
const databaseSslRejectUnauthorized = parseBoolean(
  process.env.DATABASE_SSL_REJECT_UNAUTHORIZED,
  true
);
const databaseSslCa = parseOptionalEnv("DATABASE_SSL_CA").replace(/\\n/g, "\n");

if (isProd && isVercel && !appBaseUrl) {
  throw new Error("Missing required env: APP_BASE_URL");
}

if (isProd && databaseSsl && !databaseSslRejectUnauthorized) {
  throw new Error(
    "Invalid env DATABASE_SSL_REJECT_UNAUTHORIZED: must be true in production"
  );
}

if (isProd && seedDemoUsers) {
  throw new Error("Invalid env SEED_DEMO_USERS: must be false in production");
}

if (
  isProd &&
  !seedDemoUsers &&
  (!bootstrapAdminUsername || bootstrapAdminPassword.trim().length < 12)
) {
  throw new Error(
    "Missing bootstrap admin credentials: set BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD (min 12 chars)"
  );
}

export const config = {
  env: process.env.NODE_ENV ?? "development",
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
  maxBodyBytes: 32 * 1024,
  accessTokenTtlSec: 15 * 60,
  refreshTokenTtlSec: 7 * 24 * 60 * 60,
  passwordResetTtlMinutes: parsePositiveInt(process.env.PASSWORD_RESET_TTL_MINUTES, 20),
  jwtSecret: requireSecret("JWT_SECRET", "dev-jwt-secret-change-me", 32),
  payloadSigningSecret: requireSecret(
    "PAYLOAD_SIGNING_SECRET",
    "dev-payload-secret-change-me",
    32
  ),
  cronSecret: requireSecret("CRON_SECRET", "dev-cron-secret-change-me", 24),
  dataEncryptionKey: requireSecret(
    "DATA_ENCRYPTION_KEY",
    "dev-data-key-change-me",
    32
  ),
  externalServiceUrl: process.env.EXTERNAL_SERVICE_URL?.trim() ?? "",
  externalServiceTimeoutMs: parsePositiveInt(
    process.env.EXTERNAL_SERVICE_TIMEOUT_MS,
    8_000
  ),
  databaseUrl: process.env.DATABASE_URL?.trim() ?? "",
  databaseSsl,
  databaseSslRejectUnauthorized,
  databaseSslCa,
  databaseMaxConnections: parsePositiveInt(process.env.DATABASE_MAX_CONNECTIONS, 3),
  trustProxyHeaders: parseBoolean(process.env.TRUST_PROXY_HEADERS, isVercel),
  rateLimits: {
    auth: { limit: 10, windowMs: 60_000 },
    api: { limit: 120, windowMs: 60_000 },
    heavy: { limit: 30, windowMs: 60_000 },
    throttle: {
      baseMs: 60_000,
      maxMs: 15 * 60_000,
      ttlMs: 24 * 60 * 60 * 1000,
    },
  },
  loginGuard: {
    maxAttempts: 5,
    windowMs: 10 * 60_000,
    lockMs: 15 * 60_000,
  },
  minTlsVersion: parseNumber(process.env.MIN_TLS_VERSION, 1.2),
  requireTlsVersionHeader: parseBoolean(
    process.env.REQUIRE_TLS_VERSION_HEADER,
    !isVercel
  ),
  allowInsecureHttp: !isProd && parseBoolean(process.env.ALLOW_INSECURE_HTTP, false),
  massiveQueryThreshold: 80,
  signatureSkewMs: 5 * 60_000,
  seedDemoUsers,
  bootstrapAdminUsername,
  bootstrapAdminPassword,
  bootstrapAdminName,
  appBaseUrl,
  smtp: {
    host: parseOptionalEnv("SMTP_HOST"),
    port: parsePositiveInt(process.env.SMTP_PORT, 587),
    user: parseOptionalEnv("SMTP_USER"),
    pass: process.env.SMTP_PASS ?? "",
    secure: parseBoolean(process.env.SMTP_SECURE, false),
    from: parseOptionalEnv("SMTP_FROM"),
  },
};

export const isProduction = isProd;
