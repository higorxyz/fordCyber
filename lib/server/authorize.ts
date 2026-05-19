import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, roleAllows, verifyAccessToken } from "./auth";
import { ApiError } from "./errors";
import type { Role } from "./models";
import { isSessionActive } from "./sessions";

export async function requireRole(req: NextRequest, required: Role) {
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) throw new ApiError(401, "missing_token", "Unauthorized");
  let session;
  try {
    session = await verifyAccessToken(token);
  } catch {
    throw new ApiError(401, "invalid_token", "Unauthorized");
  }
  if (!session.sessionId) {
    throw new ApiError(401, "invalid_token", "Unauthorized");
  }
  const active = await isSessionActive(session.userId, session.sessionId);
  if (!active) {
    throw new ApiError(401, "session_revoked", "Unauthorized");
  }
  if (!roleAllows(session.role, required)) {
    throw new ApiError(403, "forbidden", "Forbidden");
  }
  return session;
}
