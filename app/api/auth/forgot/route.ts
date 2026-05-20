import type { NextRequest } from "next/server";
import { findUserByIdentifier } from "@/lib/server/auth";
import { readJsonBody } from "@/lib/server/body";
import { requireCsrf } from "@/lib/server/csrf";
import { config, isProduction } from "@/lib/server/config";
import { ApiError, isApiError } from "@/lib/server/errors";
import { errorResponse, getRequestId, handlePreflight, jsonResponse, requireAllowedOrigin, requireHttps } from "@/lib/server/http";
import { logEvent } from "@/lib/server/logger";
import { isSmtpConfigured, sendPasswordResetEmail } from "@/lib/server/mailer";
import { clearPasswordResetsForUser, createPasswordReset } from "@/lib/server/passwordReset";
import { getClientIp, getUserAgent } from "@/lib/server/request";
import { rateLimit } from "@/lib/server/rateLimit";
import { passwordForgotSchema } from "@/lib/server/validators";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return handlePreflight(req);
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);

  try {
    requireHttps(req);
    requireAllowedOrigin(req);
    await requireCsrf(req, requestId, ip);
    const limiter = await rateLimit(
      `auth:forgot:${ip ?? "unknown"}`,
      config.rateLimits.auth.limit,
      config.rateLimits.auth.windowMs
    );
    if (!limiter.allowed) {
      await logEvent({ type: "password_reset_rate_limited", requestId, ip });
      return errorResponse(req, 429, "rate_limited", "Too many requests", requestId);
    }

    if (isProduction && !isSmtpConfigured()) {
      await logEvent({ type: "password_reset_delivery_blocked", requestId, ip });
      return errorResponse(req, 503, "reset_unavailable", "Request failed", requestId);
    }

    const { data } = await readJsonBody(req, passwordForgotSchema);
    const user = await findUserByIdentifier(data.identifier);

    if (!user) {
      await logEvent({
        type: "password_reset_requested_unknown",
        requestId,
        ip,
        details: { identifier: data.identifier },
      });
      return jsonResponse(req, { ok: true }, 200);
    }

    await clearPasswordResetsForUser(user.id);
    const { token } = await createPasswordReset({
      userId: user.id,
      requestedIp: ip,
      requestedUserAgent: userAgent,
    });
    const baseUrl = config.appBaseUrl.replace(/\/$/, "");
    const resetUrl = `${baseUrl}/reset?token=${encodeURIComponent(token)}`;
    let sent = false;

    try {
      sent = await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
        expiresMinutes: config.passwordResetTtlMinutes,
      });
    } catch (error) {
      await logEvent({
        type: "password_reset_send_failed",
        actorId: user.id,
        actorRole: user.role,
        requestId,
        ip,
        details: {
          message: error instanceof Error ? error.message : "Unexpected error",
        },
      });
    }

    await logEvent({
      type: sent ? "password_reset_sent" : "password_reset_pending",
      actorId: user.id,
      actorRole: user.role,
      requestId,
      ip,
    });

    if (!sent) {
      if (!isProduction) {
        return jsonResponse(req, { ok: true, previewUrl: resetUrl }, 200);
      }
      throw new ApiError(503, "email_delivery_failed", "Nao foi possivel enviar o e-mail agora");
    }

    return jsonResponse(req, { ok: true }, 200);
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    await logEvent({ type: "password_reset_error", requestId, ip });
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}
