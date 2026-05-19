import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/server/auth";
import { requireRole } from "@/lib/server/authorize";
import { requireCsrf } from "@/lib/server/csrf";
import { config, isProduction } from "@/lib/server/config";
import { ApiError, isApiError } from "@/lib/server/errors";
import { errorResponse, getRequestId, handlePreflight, jsonResponse, requireAllowedOrigin, requireHttps } from "@/lib/server/http";
import { logEvent } from "@/lib/server/logger";
import { getClientIp } from "@/lib/server/request";
import { rateLimit } from "@/lib/server/rateLimit";
import { revokeSessionForUser } from "@/lib/server/sessions";

export const runtime = "nodejs";

type Params = { params: { id: string } };

export async function OPTIONS(req: NextRequest) {
  return handlePreflight(req);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const requestId = getRequestId(req);
  const ip = getClientIp(req);

  try {
    requireHttps(req);
    requireAllowedOrigin(req);
    const session = await requireRole(req, "usuario");
    await requireCsrf(req, requestId, ip, session.userId, session.role);
    const limiter = await rateLimit(
      `auth:sessions:${ip ?? "unknown"}`,
      config.rateLimits.auth.limit,
      config.rateLimits.auth.windowMs
    );
    if (!limiter.allowed) {
      await logEvent({ type: "session_revoke_rate_limited", requestId, ip });
      return errorResponse(req, 429, "rate_limited", "Too many requests", requestId);
    }

    const targetId = params.id;
    if (!targetId) {
      throw new ApiError(400, "invalid_session", "Invalid session");
    }

    const revoked = await revokeSessionForUser(session.userId, targetId);
    if (!revoked) {
      throw new ApiError(404, "session_not_found", "Session not found");
    }

    const response = jsonResponse(req, { ok: true }, 200);
    if (session.sessionId && session.sessionId === targetId) {
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
    }

    await logEvent({
      type: "session_revoked",
      actorId: session.userId,
      actorRole: session.role,
      requestId,
      ip,
      details: { sessionId: targetId },
    });

    return response;
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    await logEvent({ type: "session_revoke_error", requestId, ip });
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}
