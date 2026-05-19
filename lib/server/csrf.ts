import crypto from "crypto";
import type { NextRequest } from "next/server";
import { ApiError } from "./errors";
import { logEvent } from "./logger";
import type { Role } from "./models";

export const CSRF_COOKIE = "fv_csrf";

export function issueCsrfToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export async function requireCsrf(
  req: NextRequest,
  requestId: string,
  ip?: string,
  actorId?: string,
  actorRole?: Role
) {
  const cookie = req.cookies.get(CSRF_COOKIE)?.value;
  const header = req.headers.get("x-csrf-token");
  if (!cookie || !header || cookie !== header) {
    await logEvent({
      type: "csrf_failed",
      requestId,
      ip,
      actorId,
      actorRole,
    });
    throw new ApiError(403, "csrf_invalid", "Forbidden");
  }
}
