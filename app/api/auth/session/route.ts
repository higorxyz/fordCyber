import type { NextRequest } from "next/server";
import { findUserById } from "@/lib/server/auth";
import { requireRole } from "@/lib/server/authorize";
import { config } from "@/lib/server/config";
import { isApiError } from "@/lib/server/errors";
import { errorResponse, getRequestId, handlePreflight, jsonResponse, requireAllowedOrigin, requireHttps } from "@/lib/server/http";
import { getClientIp } from "@/lib/server/request";
import { rateLimit } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return handlePreflight(req);
}

export async function GET(req: NextRequest) {
  const requestId = getRequestId(req);
  const ip = getClientIp(req);

  try {
    requireHttps(req);
    requireAllowedOrigin(req);
    const session = await requireRole(req, "usuario");
    const limiter = await rateLimit(
      `auth:session:${session.userId}:${ip ?? "unknown"}`,
      config.rateLimits.api.limit,
      config.rateLimits.api.windowMs
    );
    if (!limiter.allowed) {
      return errorResponse(req, 429, "rate_limited", "Too many requests", requestId);
    }
    const user = await findUserById(session.userId);
    return jsonResponse(
      req,
      { role: session.role, username: session.username, name: user?.name },
      200
    );
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    return errorResponse(req, 401, "invalid_token", "Unauthorized", requestId);
  }
}
