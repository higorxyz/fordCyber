import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/server/authorize";
import { isApiError } from "@/lib/server/errors";
import { errorResponse, getRequestId, handlePreflight, jsonResponse, requireAllowedOrigin, requireHttps } from "@/lib/server/http";
import { logEvent } from "@/lib/server/logger";
import { getClientIp } from "@/lib/server/request";
import { listSessionsForUser } from "@/lib/server/sessions";

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
    const items = await listSessionsForUser(session.userId);

    await logEvent({
      type: "session_listed",
      actorId: session.userId,
      actorRole: session.role,
      requestId,
      ip,
      details: { count: items.length },
    });

    return jsonResponse(req, { items, currentSessionId: session.sessionId }, 200);
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    await logEvent({ type: "session_list_error", requestId, ip });
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}
