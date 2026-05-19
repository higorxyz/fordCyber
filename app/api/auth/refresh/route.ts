import type { NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  findUserById,
  rotateSessionTokens,
  verifyRefreshToken,
} from "@/lib/server/auth";
import { requireCsrf } from "@/lib/server/csrf";
import { config, isProduction } from "@/lib/server/config";
import { ApiError, isApiError } from "@/lib/server/errors";
import { errorResponse, getRequestId, handlePreflight, jsonResponse, requireAllowedOrigin, requireHttps } from "@/lib/server/http";
import { logEvent } from "@/lib/server/logger";
import { getClientIp } from "@/lib/server/request";
import { rateLimit } from "@/lib/server/rateLimit";

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
      `auth:refresh:${ip ?? "unknown"}`,
      config.rateLimits.auth.limit,
      config.rateLimits.auth.windowMs
    );
    if (!limiter.allowed) {
      await logEvent({ type: "auth_refresh_rate_limited", requestId, ip });
      return errorResponse(req, 429, "rate_limited", "Too many requests", requestId);
    }

    const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
    if (!refreshToken) {
      throw new ApiError(401, "missing_refresh", "Session expired");
    }

    const { userId, sessionId } = await verifyRefreshToken(refreshToken);
    const user = await findUserById(userId);
    if (!user) {
      throw new ApiError(401, "invalid_refresh", "Session expired");
    }
    const tokens = await rotateSessionTokens(user, sessionId, refreshToken);
    if (!tokens) {
      throw new ApiError(401, "invalid_refresh", "Session expired");
    }
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
      path: "/",
    });

    await logEvent({
      type: "auth_refresh_success",
      actorId: user.id,
      actorRole: user.role,
      requestId,
      ip,
    });

    return response;
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    await logEvent({ type: "auth_refresh_error", requestId, ip });
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}
