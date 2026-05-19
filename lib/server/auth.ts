import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { config } from "./config";
import { hashToken } from "./crypto";
import { Role, User } from "./models";
import {
  ensureBootstrapUsers,
  findUserByEmail as fetchUserByEmail,
  findUserById as fetchUserById,
  findUserByIdentifier as fetchUserByIdentifier,
  findUserByUsername as fetchUserByUsername,
} from "./users";
import {
  createSession,
  generateSessionId,
  revokeAllSessions,
  revokeSession,
  updateSessionRefreshToken,
  verifySessionRefreshToken,
} from "./sessions";

const jwtKey = new TextEncoder().encode(config.jwtSecret);
const issuer = "ford-vision-api";
const audience = "ford-vision";

export const ACCESS_COOKIE = "fv_access";
export const REFRESH_COOKIE = "fv_refresh";

const roleOrder: Record<Role, number> = {
  usuario: 1,
  analista: 2,
  admin: 3,
};

export function roleAllows(role: Role, required: Role) {
  return roleOrder[role] >= roleOrder[required];
}

export async function ensureSeedUsers() {
  await ensureBootstrapUsers();
}

export async function findUserByUsername(username: string) {
  await ensureSeedUsers();
  return fetchUserByUsername(username);
}

export async function findUserByEmail(email: string) {
  await ensureSeedUsers();
  return fetchUserByEmail(email);
}

export async function findUserByIdentifier(identifier: string) {
  await ensureSeedUsers();
  return fetchUserByIdentifier(identifier);
}

export async function findUserById(userId: string) {
  await ensureSeedUsers();
  return fetchUserById(userId);
}

export function verifyPassword(user: User, password: string) {
  return bcrypt.compareSync(password, user.passwordHash);
}

export async function signAccessToken(user: User, sessionId: string) {
  return new SignJWT({ role: user.role, username: user.username, sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(user.id)
    .setExpirationTime(`${config.accessTokenTtlSec}s`)
    .sign(jwtKey);
}

export async function signRefreshToken(userId: string, sessionId: string) {
  return new SignJWT({ type: "refresh", sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(userId)
    .setExpirationTime(`${config.refreshTokenTtlSec}s`)
    .sign(jwtKey);
}

export async function createSessionTokens(
  user: User,
  meta?: { ip?: string; userAgent?: string; deviceLabel?: string }
) {
  const sessionId = generateSessionId();
  const accessToken = await signAccessToken(user, sessionId);
  const refreshToken = await signRefreshToken(user.id, sessionId);
  await createSession({
    sessionId,
    userId: user.id,
    refreshTokenHash: hashToken(refreshToken),
    ipAddress: meta?.ip,
    userAgent: meta?.userAgent,
    deviceLabel: meta?.deviceLabel ?? deriveDeviceLabel(meta?.userAgent),
  });
  return { accessToken, refreshToken, sessionId };
}

export async function verifyAccessToken(token: string) {
  const result = await jwtVerify(token, jwtKey, {
    issuer,
    audience,
  });
  return {
    userId: result.payload.sub as string,
    role: result.payload.role as Role,
    username: result.payload.username as string,
    sessionId: result.payload.sid as string | undefined,
  };
}

export async function verifyRefreshToken(token: string) {
  const result = await jwtVerify(token, jwtKey, {
    issuer,
    audience,
  });
  if (result.payload.type !== "refresh") throw new Error("Invalid token type");
  const sessionId = result.payload.sid as string | undefined;
  if (!sessionId) throw new Error("Missing session id");
  return { userId: result.payload.sub as string, sessionId };
}

export async function rotateSessionTokens(
  user: User,
  sessionId: string,
  refreshToken: string
) {
  const valid = await verifySessionRefreshToken(
    user.id,
    sessionId,
    hashToken(refreshToken)
  );
  if (!valid) return null;
  const accessToken = await signAccessToken(user, sessionId);
  const nextRefreshToken = await signRefreshToken(user.id, sessionId);
  await updateSessionRefreshToken(sessionId, hashToken(nextRefreshToken));
  return { accessToken, refreshToken: nextRefreshToken, sessionId };
}

export async function revokeSessionById(sessionId: string) {
  await revokeSession(sessionId);
}

export async function revokeAllUserSessions(userId: string, exceptSessionId?: string) {
  await revokeAllSessions(userId, exceptSessionId);
  return Boolean(await fetchUserById(userId));
}

function deriveDeviceLabel(userAgent?: string) {
  if (!userAgent) return undefined;
  const ua = userAgent.toLowerCase();
  if (ua.includes("iphone")) return "iPhone";
  if (ua.includes("ipad")) return "iPad";
  if (ua.includes("android")) return "Android";
  if (ua.includes("mac")) return "macOS";
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("linux")) return "Linux";
  return "Web";
}
