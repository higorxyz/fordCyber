import https from "https";
import { URL } from "url";
import { config } from "./config";
import { ApiError } from "./errors";
import { logEvent } from "./logger";
import type { Role } from "./models";
import { signPayload } from "./signature";

type ExternalEventName = "lead_created" | "vehicle_created" | "maintenance_created";

type DispatchContext = {
  requestId: string;
  ip?: string;
  actorId?: string;
  actorRole?: Role;
};

const tlsAgent = new https.Agent({
  keepAlive: true,
  minVersion: "TLSv1.2",
});

export async function dispatchExternalEvent(
  event: ExternalEventName,
  payload: unknown,
  context: DispatchContext
) {
  const target = config.externalServiceUrl;
  if (!target) return;

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    throw new ApiError(500, "external_service_misconfigured", "External service unavailable");
  }

  if (url.protocol !== "https:") {
    throw new ApiError(500, "external_service_https_required", "External service unavailable");
  }

  const body = JSON.stringify({
    event,
    sentAt: new Date().toISOString(),
    payload,
  });
  const timestamp = Date.now().toString();
  const signature = signPayload(body, timestamp);

  const status = await postJson(url, body, {
    "Content-Type": "application/json",
    "X-Signature-Timestamp": timestamp,
    "X-Payload-Signature": signature,
    "X-Request-Id": context.requestId,
  });

  if (status < 200 || status >= 300) {
    await logEvent({
      type: "external_service_error",
      requestId: context.requestId,
      ip: context.ip,
      actorId: context.actorId,
      actorRole: context.actorRole,
      details: { event, target: url.host, status },
    });
    throw new ApiError(502, "external_service_error", "External service unavailable");
  }

  await logEvent({
    type: "external_service_sync",
    requestId: context.requestId,
    ip: context.ip,
    actorId: context.actorId,
    actorRole: context.actorRole,
    details: { event, target: url.host, status },
  });
}

function postJson(url: URL, body: string, headers: Record<string, string>) {
  return new Promise<number>((resolve, reject) => {
    const request = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port ? Number(url.port) : 443,
        path: `${url.pathname}${url.search}`,
        method: "POST",
        headers: {
          ...headers,
          "Content-Length": Buffer.byteLength(body).toString(),
        },
        agent: tlsAgent,
        timeout: config.externalServiceTimeoutMs,
      },
      (response) => {
        response.resume();
        response.on("end", () => resolve(response.statusCode ?? 500));
      }
    );

    request.on("timeout", () => {
      request.destroy(new Error("timeout"));
    });
    request.on("error", reject);
    request.write(body);
    request.end();
  });
}
