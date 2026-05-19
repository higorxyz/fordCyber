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
import { userRoleUpdateSchema } from "@/lib/server/validators";
import { countUsersByRole, findUserById, updateUserRole } from "@/lib/server/users";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return handlePreflight(req);
}

export async function PATCH(
  req: NextRequest,
  context: { params: { id?: string } }
) {
  const requestId = getRequestId(req);
  const ip = getClientIp(req);

  try {
    requireHttps(req);
    requireAllowedOrigin(req);
    const session = await requireRole(req, "admin");
    await requireCsrf(req, requestId, ip, session.userId, session.role);
    const limiter = await rateLimit(
      `admin:users:role:${ip ?? "unknown"}`,
      config.rateLimits.heavy.limit,
      config.rateLimits.heavy.windowMs
    );
    if (!limiter.allowed) {
      await logEvent({
        type: "admin_users_role_rate_limited",
        requestId,
        ip,
        actorId: session.userId,
        actorRole: session.role,
      });
      return errorResponse(req, 429, "rate_limited", "Too many requests", requestId);
    }

    const targetId = context.params.id;
    if (!targetId) {
      throw new ApiError(400, "invalid_user", "Invalid user");
    }
    if (targetId === session.userId) {
      throw new ApiError(400, "self_role_change_forbidden", "Operation not allowed");
    }

    const { data } = await readJsonBody(req, userRoleUpdateSchema);
    const target = await findUserById(targetId);
    if (!target) {
      throw new ApiError(404, "user_not_found", "User not found");
    }
    if (target.role === data.role) {
      throw new ApiError(400, "no_effective_change", "No role change");
    }

    if (target.role === "admin" && data.role !== "admin") {
      const totalAdmins = await countUsersByRole("admin");
      if (totalAdmins <= 1) {
        throw new ApiError(400, "last_admin_protection", "Operation not allowed");
      }
    }

    const updated = await updateUserRole(targetId, data.role);
    if (!updated) {
      throw new ApiError(404, "user_not_found", "User not found");
    }

    await logEvent({
      type: "user_role_changed",
      actorId: session.userId,
      actorRole: session.role,
      requestId,
      ip,
      details: {
        userId: targetId,
        previousRole: target.role,
        nextRole: data.role,
      },
    });

    return jsonResponse(
      req,
      {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
      200
    );
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    await logEvent({ type: "admin_users_role_error", requestId, ip });
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}
