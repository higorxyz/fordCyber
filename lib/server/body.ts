import type { NextRequest } from "next/server";
import { z } from "zod";
import { config } from "./config";
import { ApiError } from "./errors";

export async function readJsonBody<S extends z.ZodTypeAny>(
  req: NextRequest,
  schema: S,
  maxBytes = config.maxBodyBytes
) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "Unsupported media type");
  }

  const lengthHeader = req.headers.get("content-length");
  if (lengthHeader) {
    const length = Number.parseInt(lengthHeader, 10);
    if (Number.isFinite(length) && length > maxBytes) {
      throw new ApiError(413, "payload_too_large", "Payload too large");
    }
  }

  const raw = await req.text();
  const rawBytes = Buffer.byteLength(raw, "utf8");
  if (rawBytes > maxBytes) {
    throw new ApiError(413, "payload_too_large", "Payload too large");
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "invalid_json", "Invalid JSON");
  }
  enforcePayloadComplexity(json);

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(400, "invalid_payload", "Invalid payload");
  }
  return { raw, data: parsed.data as z.infer<S> };
}

function enforcePayloadComplexity(value: unknown) {
  const maxDepth = 20;
  const maxNodes = 2_000;
  let nodes = 0;
  const stack: Array<{ node: unknown; depth: number }> = [{ node: value, depth: 1 }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    nodes += 1;
    if (nodes > maxNodes) {
      throw new ApiError(413, "payload_too_large", "Payload too large");
    }

    if (current.depth > maxDepth) {
      throw new ApiError(400, "invalid_payload", "Invalid payload");
    }

    const { node, depth } = current;
    if (!node || typeof node !== "object") continue;

    if (Array.isArray(node)) {
      for (const item of node) {
        stack.push({ node: item, depth: depth + 1 });
      }
      continue;
    }

    for (const item of Object.values(node)) {
      stack.push({ node: item, depth: depth + 1 });
    }
  }
}
