import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/server/authorize";
import { isApiError } from "@/lib/server/errors";
import { errorResponse, getRequestId, handlePreflight, jsonResponse, requireAllowedOrigin, requireHttps } from "@/lib/server/http";
import { getAuditEvents, logEvent } from "@/lib/server/logger";
import { getClientIp } from "@/lib/server/request";

export const runtime = "nodejs";

function normalizeHours(value: string | null) {
  if (!value) return 24;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 24;
  return Math.max(1, Math.min(parsed, 168));
}

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

    const hours = normalizeHours(req.nextUrl.searchParams.get("hours"));
    const since = Date.now() - hours * 60 * 60 * 1000;
    const events = await getAuditEvents(1000);
    const recent = events.filter(
      (event) => Date.parse(event.createdAt) >= since
    );

    const counts = recent.reduce<Record<string, number>>((acc, event) => {
      acc[event.type] = (acc[event.type] ?? 0) + 1;
      return acc;
    }, {});

    const metric = (name: string) => counts[name] ?? 0;
    const topTypes = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([type, total]) => ({ type, total }));

    await logEvent({
      type: "metrics_read",
      actorId: session.userId,
      actorRole: session.role,
      requestId,
      ip,
      details: { hours, total: recent.length },
    });

    return jsonResponse(
      req,
      {
        windowHours: hours,
        totals: {
          events: recent.length,
          loginFailed: metric("auth_login_failed"),
          authLocked: metric("auth_locked"),
          rateLimited: metric("auth_rate_limited"),
          passwordResets: metric("password_reset_completed"),
          passwordResetRequests: metric("password_reset_sent") + metric("password_reset_pending"),
          roleChanges: metric("user_role_changed"),
          sessionsRevoked: metric("session_revoked") + metric("auth_logout_all"),
        },
        topTypes,
        lastEventAt: recent[0]?.createdAt ?? null,
      },
      200
    );
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    await logEvent({ type: "metrics_read_error", requestId, ip });
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}
