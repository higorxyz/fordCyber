import type { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { requireRole } from "@/lib/server/authorize";
import { readJsonBody } from "@/lib/server/body";
import { requireCsrf } from "@/lib/server/csrf";
import { config } from "@/lib/server/config";
import { ApiError, isApiError } from "@/lib/server/errors";
import { errorResponse, getRequestId, handlePreflight, jsonResponse, requireAllowedOrigin, requireHttps } from "@/lib/server/http";
import { dispatchExternalEvent } from "@/lib/server/externalService";
import { logEvent } from "@/lib/server/logger";
import type { Lead } from "@/lib/server/models";
import { getSecurityPolicy } from "@/lib/server/policy";
import { getClientIp } from "@/lib/server/request";
import { rateLimit } from "@/lib/server/rateLimit";
import { verifyPayloadSignature } from "@/lib/server/signature";
import { getLeadStore, saveLeadStore } from "@/lib/server/store";
import { leadCreateSchema, paginationSchema } from "@/lib/server/validators";

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
      `leads:get:${ip ?? "unknown"}`,
      config.rateLimits.api.limit,
      config.rateLimits.api.windowMs
    );
    if (!limiter.allowed) {
      await logEvent({
        type: "leads_rate_limited",
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
    const { limit } = parsed.data;
    const store = await getLeadStore();
    const policy = await getSecurityPolicy();

    if (limit >= policy.massiveQueryThreshold) {
      await logEvent({
        type: "massive_query",
        actorId: session.userId,
        actorRole: session.role,
        requestId,
        ip,
        details: { resource: "leads", limit },
      });
    }

    return jsonResponse(req, { items: store.items.slice(0, limit) }, 200);
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    await logEvent({ type: "leads_read_error", requestId, ip });
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  const ip = getClientIp(req);

  try {
    requireHttps(req);
    requireAllowedOrigin(req);
    const session = await requireRole(req, "analista");
    await requireCsrf(req, requestId, ip, session.userId, session.role);
    const limiter = await rateLimit(
      `leads:post:${ip ?? "unknown"}`,
      config.rateLimits.heavy.limit,
      config.rateLimits.heavy.windowMs
    );
    if (!limiter.allowed) {
      await logEvent({
        type: "leads_rate_limited",
        requestId,
        ip,
        actorId: session.userId,
        actorRole: session.role,
      });
      return errorResponse(req, 429, "rate_limited", "Too many requests", requestId);
    }

    const { raw, data } = await readJsonBody(req, leadCreateSchema);
    const signature = req.headers.get("x-payload-signature");
    const timestamp = req.headers.get("x-signature-timestamp");
    if (!verifyPayloadSignature(raw, signature, timestamp)) {
      await logEvent({
        type: "payload_signature_invalid",
        actorId: session.userId,
        actorRole: session.role,
        requestId,
        ip,
      });
      throw new ApiError(400, "invalid_signature", "Invalid payload signature");
    }

    const now = new Date().toISOString();
    const store = await getLeadStore();
    const lead: Lead = {
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      vehicle: {
        marca: String(data.vehicle.marca),
        modelo: String(data.vehicle.modelo),
        versao: String(data.vehicle.versao),
        atributos: data.vehicle.atributos as Record<string, string | number | boolean>,
      },
      serviceDueAt: data.serviceDueAt,
      score: data.score,
    };
    await dispatchExternalEvent("lead_created", lead, {
      requestId,
      ip,
      actorId: session.userId,
      actorRole: session.role,
    });
    store.items.unshift(lead);
    await saveLeadStore(store);

    await logEvent({
      type: "lead_created",
      actorId: session.userId,
      actorRole: session.role,
      requestId,
      ip,
      details: { leadId: lead.id, score: lead.score },
    });

    return jsonResponse(req, { id: lead.id }, 201);
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    await logEvent({ type: "leads_write_error", requestId, ip });
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}
