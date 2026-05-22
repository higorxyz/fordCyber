import type { NextRequest } from "next/server";
import { config, isProduction } from "@/lib/server/config";
import { CSRF_COOKIE, issueCsrfToken } from "@/lib/server/csrf";
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
    const limiter = await rateLimit(`auth:csrf:${ip ?? "unknown"}`, 30, 60_000);
    if (!limiter.allowed) {
      return errorResponse(req, 429, "rate_limited", "Too many requests", requestId);
    }

    const token = issueCsrfToken();
    const response = jsonResponse(req, { token }, 200);
    response.cookies.set(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: isProduction,
      sameSite: "strict",
      maxAge: config.refreshTokenTtlSec,
      path: "/",
    });
    return response;
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}
