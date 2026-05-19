import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, createSessionTokens } from "@/lib/server/auth";
import { readJsonBody } from "@/lib/server/body";
import { requireCsrf } from "@/lib/server/csrf";
import { config, isProduction } from "@/lib/server/config";
import { ApiError, isApiError } from "@/lib/server/errors";
import { errorResponse, getRequestId, handlePreflight, jsonResponse, requireAllowedOrigin, requireHttps } from "@/lib/server/http";
import { logEvent } from "@/lib/server/logger";
import { getClientIp, getUserAgent } from "@/lib/server/request";
import { rateLimit } from "@/lib/server/rateLimit";
import { registerSchema } from "@/lib/server/validators";
import { createUser } from "@/lib/server/users";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return handlePreflight(req);
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  const ip = getClientIp(req);

  try {
    requireHttps(req);
    requireAllowedOrigin(req);
    await requireCsrf(req, requestId, ip);
    const limiter = await rateLimit(
      `auth:register:${ip ?? "unknown"}`,
      config.rateLimits.auth.limit,
      config.rateLimits.auth.windowMs
    );
    if (!limiter.allowed) {
      await logEvent({ type: "auth_register_rate_limited", requestId, ip });
      return errorResponse(req, 429, "rate_limited", "Too many requests", requestId);
    }

    const { data } = await readJsonBody(req, registerSchema);
    const passwordHash = bcrypt.hashSync(data.password, 10);
    const created = await createUser({
      username: data.username,
      email: data.email,
      name: data.username,
      role: "usuario",
      passwordHash,
    });

    if (!created) {
      await logEvent({
        type: "auth_register_conflict",
        requestId,
        ip,
        details: { username: data.username, email: data.email },
      });
      throw new ApiError(400, "registration_failed", "Registration failed");
    }

    const tokens = await createSessionTokens(created, { ip, userAgent: getUserAgent(req) });
    const response = jsonResponse(
      req,
      { role: created.role, username: created.username },
      201
    );
    response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: config.accessTokenTtlSec,
      path: "/",
    });
    response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: config.refreshTokenTtlSec,
      path: "/",
    });

    await logEvent({
      type: "user_registered",
      actorId: created.id,
      actorRole: created.role,
      requestId,
      ip,
    });

    return response;
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    await logEvent({ type: "auth_register_error", requestId, ip });
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}
