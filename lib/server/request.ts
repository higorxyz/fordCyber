import type { NextRequest } from "next/server";
import { isIP } from "node:net";
import { config } from "./config";

export function getClientIp(req: NextRequest) {
  if (config.trustProxyHeaders) {
    const forwarded = req.headers.get("x-forwarded-for");
    const forwardedIp = parseForwardedFor(forwarded);
    if (forwardedIp) return forwardedIp;

    const directHeaders = ["x-real-ip", "x-client-ip", "cf-connecting-ip"];
    for (const header of directHeaders) {
      const parsed = normalizeIpCandidate(req.headers.get(header));
      if (parsed) return parsed;
    }
  }

  const runtimeIp = normalizeIpCandidate((req as unknown as { ip?: string | null }).ip);
  if (runtimeIp) return runtimeIp;

  return undefined;
}

export function getUserAgent(req: NextRequest) {
  const agent = req.headers.get("user-agent");
  return agent?.trim() || undefined;
}

function parseForwardedFor(value: string | null) {
  if (!value) return undefined;
  const parts = value.split(",");
  for (const part of parts) {
    const parsed = normalizeIpCandidate(part);
    if (parsed) return parsed;
  }
  return undefined;
}

function normalizeIpCandidate(value: string | null | undefined) {
  if (!value) return undefined;
  let candidate = value.trim();
  if (!candidate) return undefined;

  if (candidate.startsWith("[") && candidate.includes("]")) {
    candidate = candidate.slice(1, candidate.indexOf("]"));
  } else {
    const hasSingleColon = (candidate.match(/:/g) ?? []).length === 1;
    if (hasSingleColon && candidate.includes(".")) {
      candidate = candidate.split(":")[0] ?? candidate;
    }
  }

  return isIP(candidate) ? candidate : undefined;
}
