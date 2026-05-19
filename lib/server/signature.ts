import crypto from "crypto";
import { config } from "./config";

export function verifyPayloadSignature(
  body: string,
  signatureHeader: string | null,
  timestampHeader: string | null
) {
  if (!signatureHeader || !timestampHeader) return false;
  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) return false;
  const now = Date.now();
  if (Math.abs(now - timestamp) > config.signatureSkewMs) return false;

  const expected = signPayload(body, timestampHeader);
  return timingSafeEqual(expected, signatureHeader);
}

export function signPayload(body: string, timestamp: string) {
  const hmac = crypto.createHmac("sha256", config.payloadSigningSecret);
  hmac.update(`${timestamp}.${body}`);
  const digest = hmac.digest("base64");
  return `v1=${digest}`;
}

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}
