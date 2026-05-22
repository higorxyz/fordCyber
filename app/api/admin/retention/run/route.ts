import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/server/authorize";
import { requireCsrf } from "@/lib/server/csrf";
import { ApiError, isApiError } from "@/lib/server/errors";
import { config } from "@/lib/server/config";
import { errorResponse, getRequestId, handlePreflight, jsonResponse, requireAllowedOrigin, requireHttps } from "@/lib/server/http";
import { logEvent } from "@/lib/server/logger";
import { getSecurityPolicy } from "@/lib/server/policy";
import { getClientIp } from "@/lib/server/request";
import { rateLimit } from "@/lib/server/rateLimit";
import {
  applyMaintenanceRetention,
  applyRetention,
  applyVehicleRetention,
} from "@/lib/server/retention";
import {
  getLeadStore,
  getMaintenanceStore,
  getVehicleStore,
  saveLeadStore,
  saveMaintenanceStore,
  saveVehicleStore,
} from "@/lib/server/store";

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
    const cronToken = req.headers.get("x-cron-token");
    const isCron = Boolean(cronToken && cronToken === config.cronSecret);

    if (cronToken && !isCron) {
      await logEvent({ type: "cron_token_invalid", requestId, ip });
      throw new ApiError(403, "invalid_cron_token", "Forbidden");
    }
    const limiter = await rateLimit(
      `retention:run:${isCron ? "cron" : ip ?? "unknown"}`,
      config.rateLimits.heavy.limit,
      config.rateLimits.heavy.windowMs
    );
    if (!limiter.allowed) {
      await logEvent({
        type: "retention_rate_limited",
        requestId,
        ip,
        details: { trigger: isCron ? "cron" : "manual" },
      });
      return errorResponse(req, 429, "rate_limited", "Too many requests", requestId);
    }

    let actorId: string | undefined;
    let actorRole: "admin" | undefined;

    if (isCron) {
      actorId = "system";
      actorRole = "admin";
    } else {
      const session = await requireRole(req, "admin");
      await requireCsrf(req, requestId, ip, session.userId, session.role);
      actorId = session.userId;
      actorRole = "admin";
    }
    const policy = await getSecurityPolicy();
    const daysQuery = req.nextUrl.searchParams.get("days");
    const daysParam =
      daysQuery === null ? policy.retentionDays : Number.parseInt(daysQuery, 10);
    if (!Number.isFinite(daysParam) || !Number.isInteger(daysParam) || daysParam <= 0) {
      throw new ApiError(400, "invalid_days", "Invalid retention window");
    }
    if (daysParam > policy.retentionDays) {
      throw new ApiError(400, "invalid_days", "Retention window exceeds policy");
    }

    const leadStore = await getLeadStore();
    const leadResult = applyRetention(leadStore.items, daysParam);
    leadStore.items = leadResult.kept;
    await saveLeadStore(leadStore);

    const maintenanceStore = await getMaintenanceStore();
    const maintenanceResult = applyMaintenanceRetention(maintenanceStore.items, daysParam);
    maintenanceStore.items = maintenanceResult.kept;
    await saveMaintenanceStore(maintenanceStore);

    const vehicleStore = await getVehicleStore();
    const vehicleResult = applyVehicleRetention(vehicleStore.items, daysParam);
    vehicleStore.items = vehicleResult.kept;
    await saveVehicleStore(vehicleStore);

    await logEvent({
      type: "retention_applied",
      actorId,
      actorRole,
      requestId,
      details: {
        leads: {
          anonymized: leadResult.anonymized,
          removed: leadResult.removed,
        },
        maintenance: {
          anonymized: maintenanceResult.anonymized,
          removed: maintenanceResult.removed,
        },
        vehicles: {
          anonymized: vehicleResult.anonymized,
          removed: vehicleResult.removed,
        },
        days: daysParam,
        trigger: isCron ? "cron" : "manual",
      },
    });

    return jsonResponse(
      req,
      {
        ok: true,
        leads: {
          anonymized: leadResult.anonymized,
          removed: leadResult.removed,
        },
        maintenance: {
          anonymized: maintenanceResult.anonymized,
          removed: maintenanceResult.removed,
        },
        vehicles: {
          anonymized: vehicleResult.anonymized,
          removed: vehicleResult.removed,
        },
      },
      200
    );
  } catch (err) {
    if (isApiError(err)) {
      return errorResponse(req, err.status, err.code, err.safeMessage, requestId);
    }
    await logEvent({ type: "retention_run_error", requestId, ip });
    return errorResponse(req, 500, "server_error", "Request failed", requestId);
  }
}
