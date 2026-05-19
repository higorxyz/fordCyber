import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/server/authorize";
import { readJsonBody } from "@/lib/server/body";
import { requireCsrf } from "@/lib/server/csrf";
import { config } from "@/lib/server/config";
import { ApiError, isApiError } from "@/lib/server/errors";
import { errorResponse, getRequestId, handlePreflight, jsonResponse, requireAllowedOrigin, requireHttps } from "@/lib/server/http";
import { logEvent } from "@/lib/server/logger";
import { getClientIp } from "@/lib/server/request";
import { rateLimit } from "@/lib/server/rateLimit";
import { adminUserCreateSchema, paginationSchema } from "@/lib/server/validators";
import { createUser, listUsers } from "@/lib/server/users";

export const runtime = "nodejs";
const ADMIN_LOCAL_DOMAIN = "admin.local";
const MAX_CREATE_ATTEMPTS = 6;

export async function OPTIONS(req: NextRequest) {
  return handlePreflight(req);
}

export async function GET(req: NextRequest) {
  const requestId = getRequestId(req);
  const ip = getClientIp(req);

  try {
    requireHttps(req);
    requireAllowedOrigin(req);
    const session = await requireRole(req, "admin");
    const limiter = await rateLimit(
      `admin:users:get:${ip ?? "unknown"}`,
      60,
      60_000
    );
    if (!limiter.allowed) {
      await logEvent({
        type: "admin_users_rate_limited",
        requestId,
        ip,
        actorId: session.userId,
        actorRole: session.role,
      });
      return errorResponse(req, 429, "rate_limited", "Too many requests", requestId);
    }

    const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "50");
    const parsed = paginationSchema.safeParse({ limit: limitParam });
    if (!parsed.success) {
      throw new ApiError(400, "invalid_query", "Invalid query");
    }

    const users = await listUsers(parsed.data.limit);
    const items = users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return jsonResponse(req, { items }, 200);
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    await logEvent({ type: "admin_users_read_error", requestId, ip });
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  const ip = getClientIp(req);

  try {
    requireHttps(req);
    requireAllowedOrigin(req);
    const session = await requireRole(req, "admin");
    await requireCsrf(req, requestId, ip, session.userId, session.role);
    const limiter = await rateLimit(
      `admin:users:create:${ip ?? "unknown"}`,
      config.rateLimits.heavy.limit,
      config.rateLimits.heavy.windowMs
    );
    if (!limiter.allowed) {
      await logEvent({
        type: "admin_users_create_rate_limited",
        requestId,
        ip,
        actorId: session.userId,
        actorRole: session.role,
      });
      return errorResponse(req, 429, "rate_limited", "Too many requests", requestId);
    }

    const { data } = await readJsonBody(req, adminUserCreateSchema);
    const providedUsername = data.username;
    const providedEmail = data.email;
    const usernameSeed =
      providedUsername ??
      deriveUsernameFromEmail(providedEmail) ??
      `user.${nanoid(6).toLowerCase()}`;
    const baseUsername =
      sanitizeUsernameCandidate(usernameSeed) || `user.${nanoid(6).toLowerCase()}`;
    const passwordHash = bcrypt.hashSync(data.password, 10);

    let created = null;
    for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
      const username =
        providedUsername || attempt === 0
          ? baseUsername
          : withUsernameSuffix(baseUsername);
      const email = providedEmail ?? `${username}@${ADMIN_LOCAL_DOMAIN}`;
      created = await createUser({
        username,
        email,
        name: data.name,
        role: data.role,
        passwordHash,
      });
      if (created) break;
      if (providedUsername) break;
    }

    if (!created) {
      throw new ApiError(400, "user_conflict", "User already exists");
    }

    await logEvent({
      type: "admin_user_created",
      actorId: session.userId,
      actorRole: session.role,
      requestId,
      ip,
      details: {
        userId: created.id,
        role: created.role,
        generatedUsername: !providedUsername,
        generatedEmail: !providedEmail,
      },
    });

    return jsonResponse(
      req,
      {
        user: {
          id: created.id,
          username: created.username,
          email: created.email,
          name: created.name,
          role: created.role,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        },
        generated: {
          username: !providedUsername,
          email: !providedEmail,
        },
      },
      201
    );
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    await logEvent({ type: "admin_users_create_error", requestId, ip });
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}

function deriveUsernameFromEmail(email: string | undefined) {
  if (!email) return undefined;
  return email.split("@")[0]?.trim().toLowerCase();
}

function sanitizeUsernameCandidate(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/[._-]{2,}/g, ".")
    .replace(/^[._-]+|[._-]+$/g, "");

  if (normalized.length < 3) return "";
  return normalized.slice(0, 32);
}

function withUsernameSuffix(base: string) {
  const suffix = nanoid(4).toLowerCase();
  const prefixLength = Math.max(3, 32 - suffix.length - 1);
  return `${base.slice(0, prefixLength)}.${suffix}`;
}
