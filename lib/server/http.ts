import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { config } from "./config";
import { ApiError } from "./errors";

export function getRequestId(req: NextRequest) {
  return req.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function isAllowedOrigin(origin: string | null) {
  if (!origin) return true;
  return config.allowedOrigins.includes(origin);
}

export function buildCorsHeaders(origin: string | null) {
  const headers = new Headers();
  if (origin && config.allowedOrigins.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Payload-Signature, X-Signature-Timestamp, X-Request-Id, X-CSRF-Token, X-Cron-Token"
  );
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Vary", "Origin");
  return headers;
}

export function handlePreflight(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: "origin_not_allowed" }, { status: 403 });
  }
  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(origin) });
}

export function jsonResponse(
  req: NextRequest,
  data: unknown,
  status = 200,
  extraHeaders?: Headers
) {
  const origin = req.headers.get("origin");
  const headers = buildCorsHeaders(origin);
  headers.set("Cache-Control", "no-store");
  headers.set("Pragma", "no-cache");
  if (extraHeaders) {
    extraHeaders.forEach((value, key) => headers.set(key, value));
  }
  return NextResponse.json(data, { status, headers });
}

export function errorResponse(
  req: NextRequest,
  status: number,
  code: string,
  message: string,
  requestId: string
) {
  return jsonResponse(req, { error: { code, message, requestId } }, status);
}

export function requireHttps(req: NextRequest) {
  if (config.allowInsecureHttp) return;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const requestProtocol = req.nextUrl.protocol.replace(":", "").toLowerCase();
  if ((proto && proto !== "https") || (!proto && requestProtocol !== "https")) {
    throw new ApiError(400, "https_required", "HTTPS required");
  }
  const tlsVersion = getTlsVersion(req);
  if (tlsVersion === null) {
    if (config.requireTlsVersionHeader) {
      throw new ApiError(400, "tls_version_unknown", "TLS 1.2+ required");
    }
    return;
  }
  if (tlsVersion < config.minTlsVersion) {
    throw new ApiError(400, "tls_version_unsupported", "TLS 1.2+ required");
  }
}

export function requireAllowedOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && !isAllowedOrigin(origin)) {
    throw new ApiError(403, "origin_not_allowed", "Origin not allowed");
  }
}

function getTlsVersion(req: NextRequest) {
  const candidateHeaders = [
    "x-forwarded-tls-version",
    "x-tls-version",
    "x-envoy-tls-version",
    "cf-tls-version",
  ];
  for (const header of candidateHeaders) {
    const raw = req.headers.get(header);
    const parsed = parseTlsVersion(raw);
    if (parsed !== null) return parsed;
  }
  return null;
}

function parseTlsVersion(raw: string | null) {
  if (!raw) return null;
  const normalized = raw.trim().toUpperCase();
  const match = normalized.match(/(?:TLSV?)?(\d(?:\.\d)?)/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}
