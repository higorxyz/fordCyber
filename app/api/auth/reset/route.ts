import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { findUserById, revokeAllUserSessions } from "@/lib/server/auth";
import { readJsonBody } from "@/lib/server/body";
import { requireCsrf } from "@/lib/server/csrf";
import { config } from "@/lib/server/config";
import { ApiError, isApiError } from "@/lib/server/errors";
import { errorResponse, getRequestId, handlePreflight, jsonResponse, requireAllowedOrigin, requireHttps } from "@/lib/server/http";
import { logEvent } from "@/lib/server/logger";
import { clearPasswordResetsForUser, consumePasswordReset } from "@/lib/server/passwordReset";
import { getClientIp } from "@/lib/server/request";
import { rateLimit } from "@/lib/server/rateLimit";
import { passwordResetSchema } from "@/lib/server/validators";
import { updateUserPassword } from "@/lib/server/users";

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
      `auth:reset:${ip ?? "unknown"}`,
      config.rateLimits.auth.limit,
      config.rateLimits.auth.windowMs
    );
    if (!limiter.allowed) {
      await logEvent({ type: "password_reset_rate_limited", requestId, ip });
      return errorResponse(req, 429, "rate_limited", "Too many requests", requestId);
    }

    const { data } = await readJsonBody(req, passwordResetSchema);
    const consumed = await consumePasswordReset(data.token);
    if (!consumed) {
      await logEvent({ type: "password_reset_invalid", requestId, ip });
      throw new ApiError(400, "invalid_reset", "Invalid token");
    }

    const user = await findUserById(consumed.userId);
    if (!user) {
      await logEvent({ type: "password_reset_unknown_user", requestId, ip });
      throw new ApiError(400, "invalid_reset", "Invalid token");
    }

    const passwordHash = bcrypt.hashSync(data.password, 10);
    await updateUserPassword(user.id, passwordHash);
    await revokeAllUserSessions(user.id);
    await clearPasswordResetsForUser(user.id);

    await logEvent({
      type: "password_reset_completed",
      actorId: user.id,
      actorRole: user.role,
      requestId,
      ip,
    });

    return jsonResponse(req, { ok: true }, 200);
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    await logEvent({ type: "password_reset_error", requestId, ip });
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}
