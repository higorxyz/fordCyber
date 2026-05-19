import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, revokeAllUserSessions } from "@/lib/server/auth";
import { requireRole } from "@/lib/server/authorize";
import { requireCsrf } from "@/lib/server/csrf";
import { config, isProduction } from "@/lib/server/config";
import { isApiError } from "@/lib/server/errors";
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
    const session = await requireRole(req, "usuario");
    await requireCsrf(req, requestId, ip, session.userId, session.role);
    const limiter = await rateLimit(
      `auth:logout-all:${ip ?? "unknown"}`,
      config.rateLimits.auth.limit,
      config.rateLimits.auth.windowMs
    );
    if (!limiter.allowed) {
      await logEvent({ type: "auth_logout_all_rate_limited", requestId, ip });
      return errorResponse(req, 429, "rate_limited", "Too many requests", requestId);
    }

    await revokeAllUserSessions(session.userId);
    const response = jsonResponse(req, { ok: true }, 200);
    response.cookies.set(ACCESS_COOKIE, "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });
    response.cookies.set(REFRESH_COOKIE, "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });

    await logEvent({
      type: "auth_logout_all",
      actorId: session.userId,
      actorRole: session.role,
      requestId,
      ip,
    });

    return response;
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    await logEvent({ type: "auth_logout_all_error", requestId, ip });
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}
