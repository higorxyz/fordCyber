import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/server/authorize";
import { ApiError, isApiError } from "@/lib/server/errors";
import { errorResponse, getRequestId, handlePreflight, jsonResponse, requireAllowedOrigin, requireHttps } from "@/lib/server/http";
import { anonymizeLead } from "@/lib/server/retention";
import { getLeadStore } from "@/lib/server/store";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return handlePreflight(req);
}

export async function GET(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    requireHttps(req);
    requireAllowedOrigin(req);
    await requireRole(req, "analista");
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
