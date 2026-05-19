import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/server/authorize";
import { requireCsrf } from "@/lib/server/csrf";
import { config } from "@/lib/server/config";
import { ApiError, isApiError } from "@/lib/server/errors";
import {
  errorResponse,
  getRequestId,
  handlePreflight,
  jsonResponse,
  requireAllowedOrigin,
  requireHttps,
} from "@/lib/server/http";
import { logEvent } from "@/lib/server/logger";
import { clearPasswordResetsForUser } from "@/lib/server/passwordReset";
import { getClientIp } from "@/lib/server/request";
import { rateLimit } from "@/lib/server/rateLimit";
import { revokeAllSessions } from "@/lib/server/sessions";
import { countUsersByRole, deleteUserById, findUserById } from "@/lib/server/users";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return handlePreflight(req);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id?: string }> }
) {
  const requestId = getRequestId(req);
  const ip = getClientIp(req);

  try {
    requireHttps(req);
    requireAllowedOrigin(req);
    const session = await requireRole(req, "admin");
    await requireCsrf(req, requestId, ip, session.userId, session.role);
    const limiter = await rateLimit(
      `admin:users:delete:${ip ?? "unknown"}`,
      config.rateLimits.heavy.limit,
      config.rateLimits.heavy.windowMs
    );
    if (!limiter.allowed) {
      await logEvent({
        type: "admin_users_delete_rate_limited",
        requestId,
        ip,
        actorId: session.userId,
        actorRole: session.role,
      });
      return errorResponse(req, 429, "rate_limited", "Too many requests", requestId);
    }

    const { id: targetId } = await context.params;
    if (!targetId) {
      throw new ApiError(400, "invalid_user", "Invalid user");
    }
    if (targetId === session.userId) {
      throw new ApiError(400, "self_delete_forbidden", "Operation not allowed");
    }

    const target = await findUserById(targetId);
    if (!target) {
      throw new ApiError(404, "user_not_found", "User not found");
    }

    if (target.role === "admin") {
      const totalAdmins = await countUsersByRole("admin");
      if (totalAdmins <= 1) {
        throw new ApiError(400, "last_admin_protection", "Operation not allowed");
      }
    }

    const deleted = await deleteUserById(targetId);
    if (!deleted) {
      throw new ApiError(404, "user_not_found", "User not found");
    }

    await revokeAllSessions(targetId);
    await clearPasswordResetsForUser(targetId);

    await logEvent({
      type: "admin_user_deleted",
      actorId: session.userId,
      actorRole: session.role,
      requestId,
      ip,
      details: {
        userId: deleted.id,
        role: deleted.role,
      },
    });

    return jsonResponse(req, { ok: true, id: deleted.id }, 200);
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    await logEvent({ type: "admin_users_delete_error", requestId, ip });
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}
