import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/server/authorize";
import { ApiError, isApiError } from "@/lib/server/errors";
import { errorResponse, getRequestId, handlePreflight, jsonResponse, requireAllowedOrigin, requireHttps } from "@/lib/server/http";
import { logEvent } from "@/lib/server/logger";
import { getClientIp } from "@/lib/server/request";
import { rateLimit } from "@/lib/server/rateLimit";
import { paginationSchema } from "@/lib/server/validators";
import { listUsers } from "@/lib/server/users";

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
