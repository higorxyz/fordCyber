import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/server/authorize";
import { ApiError, isApiError } from "@/lib/server/errors";
import { errorResponse, getRequestId, handlePreflight, jsonResponse, requireAllowedOrigin, requireHttps } from "@/lib/server/http";
import { getAuditEvents, logEvent } from "@/lib/server/logger";
import { getSecurityPolicy } from "@/lib/server/policy";
import { getClientIp } from "@/lib/server/request";
import { auditQuerySchema } from "@/lib/server/validators";

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
    const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "100");
    const query = {
      limit: limitParam,
      type: req.nextUrl.searchParams.get("type") ?? undefined,
      actorId: req.nextUrl.searchParams.get("actorId") ?? undefined,
      actorRole: req.nextUrl.searchParams.get("actorRole") ?? undefined,
      ip: req.nextUrl.searchParams.get("ip") ?? undefined,
      from: req.nextUrl.searchParams.get("from") ?? undefined,
      to: req.nextUrl.searchParams.get("to") ?? undefined,
      format: req.nextUrl.searchParams.get("format") ?? undefined,
    };
    const parsed = auditQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new ApiError(400, "invalid_query", "Invalid query");
    }
    const { limit, type, actorId, actorRole, ip: ipFilter, from, to, format } = parsed.data;
    const policy = await getSecurityPolicy();

    if (limit >= policy.massiveQueryThreshold) {
      await logEvent({
        type: "massive_query",
        actorId: session.userId,
        actorRole: session.role,
        requestId,
        ip,
        details: { resource: "audit", limit },
      });
    }

    const fetchLimit = Math.min(1000, Math.max(limit, 200));
    const items = await getAuditEvents(fetchLimit);
    const fromTime = from ? Date.parse(from) : null;
    const toTime = to ? Date.parse(to) : null;
    const filtered = items.filter((event) => {
      if (type && event.type !== type) return false;
      if (actorId && event.actorId !== actorId) return false;
      if (actorRole && event.actorRole !== actorRole) return false;
      if (ipFilter && event.ip !== ipFilter) return false;
      const created = Date.parse(event.createdAt);
      if (fromTime && created < fromTime) return false;
      if (toTime && created > toTime) return false;
      return true;
    });
    const result = filtered.slice(0, limit);

    if (format === "csv") {
      const headers = ["id", "type", "actorId", "actorRole", "ip", "createdAt", "details"];
      const lines = [headers.join(",")];
      for (const item of result) {
        const row = [
          item.id,
          item.type,
          item.actorId ?? "",
          item.actorRole ?? "",
          item.ip ?? "",
          item.createdAt,
          item.details ? JSON.stringify(item.details) : "",
        ].map(escapeCsv);
        lines.push(row.join(","));
      }
      const origin = req.headers.get("origin");
      const headersOut = new Headers();
      headersOut.set("Content-Type", "text/csv; charset=utf-8");
      headersOut.set("Content-Disposition", "attachment; filename=\"audit-events.csv\"");
      headersOut.set("Cache-Control", "no-store");
      headersOut.set("Pragma", "no-cache");
      if (origin) {
        headersOut.set("Access-Control-Allow-Origin", origin);
        headersOut.set("Access-Control-Allow-Credentials", "true");
        headersOut.set("Vary", "Origin");
      }
      return new Response(lines.join("\n"), { status: 200, headers: headersOut });
    }

    return jsonResponse(req, { items: result }, 200);
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    await logEvent({ type: "audit_read_error", requestId, ip });
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}

function escapeCsv(value: string) {
  if (value.includes("\"")) {
    value = value.replace(/"/g, "\"\"");
  }
  if (value.includes(",") || value.includes("\n")) {
    return `"${value}"`;
  }
  return value;
}
