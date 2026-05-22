import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/server/authorize";
import { config } from "@/lib/server/config";
import { isApiError } from "@/lib/server/errors";
import { errorResponse, getRequestId, handlePreflight, jsonResponse, requireAllowedOrigin, requireHttps } from "@/lib/server/http";
import { logEvent } from "@/lib/server/logger";
import { getClientIp } from "@/lib/server/request";
import { rateLimit } from "@/lib/server/rateLimit";
import { anonymizeLead } from "@/lib/server/retention";
import { getLeadStore } from "@/lib/server/store";

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
    const session = await requireRole(req, "analista");
    const limiter = await rateLimit(
      `leads:anon:${session.userId}:${ip ?? "unknown"}`,
      config.rateLimits.api.limit,
      config.rateLimits.api.windowMs
    );
    if (!limiter.allowed) {
      await logEvent({
        type: "leads_anon_rate_limited",
        requestId,
        ip,
        actorId: session.userId,
        actorRole: session.role,
      });
      return errorResponse(req, 429, "rate_limited", "Too many requests", requestId);
    }
    const store = await getLeadStore();
    const anon = store.items.map((lead) => anonymizeLead(lead));
    return jsonResponse(req, { items: anon }, 200);
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}
