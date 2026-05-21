import type { NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  LEGACY_REFRESH_COOKIE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  createSessionTokens,
  findUserByIdentifier,
  verifyPassword,
} from "@/lib/server/auth";
import { readJsonBody } from "@/lib/server/body";
import { config, isProduction } from "@/lib/server/config";
import { ApiError, isApiError } from "@/lib/server/errors";
import { requireCsrf } from "@/lib/server/csrf";
import { errorResponse, getRequestId, handlePreflight, jsonResponse, requireAllowedOrigin, requireHttps } from "@/lib/server/http";
import { logEvent } from "@/lib/server/logger";
import { checkLoginLock, clearLoginGuard, recordFailedLogin } from "@/lib/server/loginGuard";
import { rateLimit } from "@/lib/server/rateLimit";
import { getClientIp, getUserAgent } from "@/lib/server/request";
import { loginSchema } from "@/lib/server/validators";

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
      `auth:${ip ?? "unknown"}`,
      config.rateLimits.auth.limit,
      config.rateLimits.auth.windowMs
    );

    if (!limiter.allowed) {
      await logEvent({
        type: "auth_rate_limited",
        requestId,
        ip,
      });
      return errorResponse(req, 429, "rate_limited", "Too many requests", requestId);
    }

    const { data } = await readJsonBody(req, loginSchema);
    const identifier = data.identifier ?? data.username ?? data.email ?? "";
    const locked = await checkLoginLock(identifier);
    if (locked.locked) {
      await logEvent({
        type: "auth_locked",
        requestId,
        ip,
        details: { username: identifier },
      });
      return errorResponse(req, 429, "account_locked", "Too many attempts", requestId);
    }
    const user = await findUserByIdentifier(identifier);

    if (!user) {
      const result = await recordFailedLogin(identifier, ip);
      await logEvent({
        type: "auth_login_failed",
        requestId,
        ip,
        details: { username: identifier },
      });
      if (result.locked) {
        await logEvent({
          type: "auth_locked",
          requestId,
          ip,
          details: { username: identifier },
        });
        return errorResponse(req, 429, "account_locked", "Too many attempts", requestId);
      }
      throw new ApiError(401, "invalid_credentials", "Credenciais invalidas");
    }

    if (!verifyPassword(user, data.password)) {
      const result = await recordFailedLogin(identifier, ip);
      await logEvent({
        type: "auth_login_failed",
        requestId,
        ip,
        details: { username: identifier, userId: user.id },
      });
      if (result.locked) {
        await logEvent({
          type: "auth_locked",
          requestId,
          ip,
          details: { username: identifier, userId: user.id },
        });
        return errorResponse(req, 429, "account_locked", "Too many attempts", requestId);
      }
      throw new ApiError(401, "invalid_credentials", "Credenciais invalidas");
    }

    await clearLoginGuard(identifier);

    const tokens = await createSessionTokens(user, { ip, userAgent: getUserAgent(req) });
    const response = jsonResponse(req, { role: user.role, username: user.username }, 200);
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
      path: REFRESH_COOKIE_PATH,
    });
    response.cookies.set(LEGACY_REFRESH_COOKIE, "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });

    await logEvent({
      type: "auth_login_success",
      actorId: user.id,
      actorRole: user.role,
      requestId,
      ip,
    });

    return response;
  } catch (err) {
    if (isApiError(err)) {
      const response = errorResponse(req, err.status, err.code, err.safeMessage, requestId);
      response.cookies.set(LEGACY_REFRESH_COOKIE, "", {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        maxAge: 0,
        path: "/",
      });
      return response;
    }
    await logEvent({
      type: "auth_login_error",
      requestId,
      ip,
      details: {
        message: err instanceof Error ? err.message : "Unexpected auth error",
      },
    });
    const response = errorResponse(req, 500, "server_error", "Request failed", requestId);
    response.cookies.set(LEGACY_REFRESH_COOKIE, "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });
    return response;
  }
}
