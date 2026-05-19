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
    const firstIssue = parsed.error.issues[0];
    throw new ApiError(
      400,
      "invalid_payload",
      firstIssue ? describeValidationIssue(firstIssue) : "Payload invalido"
    );
  }
  return { raw, data: parsed.data as z.infer<S> };
}

function describeValidationIssue(issue: z.ZodIssue) {
  const field = formatFieldPath(issue.path);

  if (issue.code === z.ZodIssueCode.too_small) {
    if (issue.type === "string") {
      return `${field} deve ter no minimo ${issue.minimum} caracteres`;
    }
    if (issue.type === "number") {
      return `${field} deve ser maior ou igual a ${issue.minimum}`;
    }
    return `${field} possui tamanho insuficiente`;
  }

  if (issue.code === z.ZodIssueCode.too_big) {
    if (issue.type === "string") {
      return `${field} deve ter no maximo ${issue.maximum} caracteres`;
    }
    if (issue.type === "number") {
      return `${field} deve ser menor ou igual a ${issue.maximum}`;
    }
    return `${field} excede o limite permitido`;
  }

  if (issue.code === z.ZodIssueCode.invalid_string) {
    if (issue.validation === "email") {
      return `${field} deve ser um e-mail valido`;
    }
    return `${field} possui formato invalido`;
  }

  if (issue.code === z.ZodIssueCode.invalid_type) {
    return `${field} com tipo invalido`;
  }

  if (issue.code === z.ZodIssueCode.invalid_enum_value) {
    return `${field} possui um valor invalido`;
  }

  if (issue.code === z.ZodIssueCode.custom) {
    return translateCustomIssueMessage(issue.message, field);
  }

  if (issue.message && issue.message !== "Invalid input") {
    return `${field}: ${issue.message}`;
  }
  return `${field} invalido`;
}

function translateCustomIssueMessage(message: string, field: string) {
  switch (message) {
    case "Missing lowercase":
      return `${field} deve conter pelo menos uma letra minuscula`;
    case "Missing uppercase":
      return `${field} deve conter pelo menos uma letra maiuscula`;
    case "Missing number":
      return `${field} deve conter pelo menos um numero`;
    case "Missing symbol":
      return `${field} deve conter pelo menos um simbolo`;
    case "Missing identifier":
      return "Informe usuario ou e-mail";
    case "Potentially unsafe input":
      return `${field} contem caracteres nao permitidos`;
    case "Either username or email is required":
      return "Informe username ou e-mail";
    default:
      return message || `${field} invalido`;
  }
}

function formatFieldPath(path: Array<string | number>) {
  if (!path || path.length === 0) return "Payload";
  const joined = path.map((part) => String(part)).join(".");
  return `Campo ${joined}`;
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
