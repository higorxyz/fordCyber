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
import type { Vehicle } from "@/lib/server/models";
import { getSecurityPolicy } from "@/lib/server/policy";
import { getClientIp } from "@/lib/server/request";
import { rateLimit } from "@/lib/server/rateLimit";
import { verifyPayloadSignature } from "@/lib/server/signature";
import { getVehicleStore, saveVehicleStore } from "@/lib/server/store";
import { paginationSchema, vehicleCreateSchema } from "@/lib/server/validators";

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
      `vehicles:get:${ip ?? "unknown"}`,
      config.rateLimits.api.limit,
      config.rateLimits.api.windowMs
    );
    if (!limiter.allowed) {
      await logEvent({
        type: "vehicles_rate_limited",
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
    const store = await getVehicleStore();
    const policy = await getSecurityPolicy();

    if (limit >= policy.massiveQueryThreshold) {
      await logEvent({
        type: "massive_query",
        actorId: session.userId,
        actorRole: session.role,
        requestId,
        ip,
        details: { resource: "vehicles", limit },
      });
    }
    return jsonResponse(req, { items: store.items.slice(0, limit) }, 200);
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    await logEvent({ type: "vehicles_read_error", requestId, ip });
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
      `vehicles:post:${ip ?? "unknown"}`,
      config.rateLimits.heavy.limit,
      config.rateLimits.heavy.windowMs
    );
    if (!limiter.allowed) {
      await logEvent({
        type: "vehicles_rate_limited",
        requestId,
        ip,
        actorId: session.userId,
        actorRole: session.role,
      });
      return errorResponse(req, 429, "rate_limited", "Too many requests", requestId);
    }

    const { raw, data } = await readJsonBody(req, vehicleCreateSchema);
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

    const store = await getVehicleStore();
    const record: Vehicle = {
      id: nanoid(),
      createdAt: new Date().toISOString(),
      vin: String(data.vin),
      marca: String(data.marca),
      modelo: String(data.modelo),
      versao: String(data.versao),
      atributos: data.atributos as Record<string, string | number | boolean>,
    };
    await dispatchExternalEvent("vehicle_created", record, {
      requestId,
      ip,
      actorId: session.userId,
      actorRole: session.role,
    });
    store.items.unshift(record);
    await saveVehicleStore(store);

    await logEvent({
      type: "vehicle_created",
      actorId: session.userId,
      actorRole: session.role,
      requestId,
      ip,
      details: { vehicleId: record.id, vin: record.vin },
    });

    return jsonResponse(req, { id: record.id }, 201);
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    await logEvent({ type: "vehicles_write_error", requestId, ip });
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}
