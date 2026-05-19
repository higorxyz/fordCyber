import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/server/authorize";
import { readJsonBody } from "@/lib/server/body";
import { requireCsrf } from "@/lib/server/csrf";
import { config } from "@/lib/server/config";
import { ApiError, isApiError } from "@/lib/server/errors";
import { errorResponse, getRequestId, handlePreflight, jsonResponse, requireAllowedOrigin, requireHttps } from "@/lib/server/http";
import { logEvent } from "@/lib/server/logger";
import { getSecurityPolicy, SECURITY_POLICY_LIMITS, updateSecurityPolicy } from "@/lib/server/policy";
import { getClientIp } from "@/lib/server/request";
import { rateLimit } from "@/lib/server/rateLimit";
import { securityPolicyUpdateSchema } from "@/lib/server/validators";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return handlePreflight(req);
}

export async function GET(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    requireHttps(req);
    requireAllowedOrigin(req);
    await requireRole(req, "admin");
    const policy = await getSecurityPolicy();
    return jsonResponse(req, { policy, limits: SECURITY_POLICY_LIMITS }, 200);
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  const ip = getClientIp(req);

  try {
    requireHttps(req);
    requireAllowedOrigin(req);
    const session = await requireRole(req, "admin");
    await requireCsrf(req, requestId, ip, session.userId, session.role);
    const limiter = await rateLimit(
      `security-policy:post:${ip ?? "unknown"}`,
      config.rateLimits.heavy.limit,
      config.rateLimits.heavy.windowMs
    );
    if (!limiter.allowed) {
      await logEvent({
        type: "security_policy_rate_limited",
        requestId,
        ip,
        actorId: session.userId,
        actorRole: session.role,
      });
      return errorResponse(req, 429, "rate_limited", "Too many requests", requestId);
    }

    const { data } = await readJsonBody(req, securityPolicyUpdateSchema);
    const current = await getSecurityPolicy();
    const updates: Partial<Pick<typeof current, "retentionDays" | "massiveQueryThreshold">> = {};
    if (typeof data.retentionDays === "number") updates.retentionDays = data.retentionDays;
    if (typeof data.massiveQueryThreshold === "number") {
      updates.massiveQueryThreshold = data.massiveQueryThreshold;
    }

    const changedFields = Object.keys(updates).filter((field) => {
      const key = field as keyof typeof updates;
      return updates[key] !== undefined && updates[key] !== current[key];
    });
    if (changedFields.length === 0) {
      throw new ApiError(400, "no_effective_change", "No policy field changed");
    }

    const result = await updateSecurityPolicy(updates, session.userId);
    await logEvent({
      type: "config_changed",
      actorId: session.userId,
      actorRole: session.role,
      requestId,
      ip,
      details: {
        scope: "security_policy",
        changedFields,
        previous: {
          retentionDays: result.previous.retentionDays,
          massiveQueryThreshold: result.previous.massiveQueryThreshold,
        },
        current: {
          retentionDays: result.current.retentionDays,
          massiveQueryThreshold: result.current.massiveQueryThreshold,
        },
      },
    });

    return jsonResponse(req, { policy: result.current }, 200);
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    await logEvent({ type: "security_policy_write_error", requestId, ip });
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}
