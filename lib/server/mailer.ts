import nodemailer from "nodemailer";
import { config, isProduction } from "./config";

let transport: nodemailer.Transporter | null = null;

function buildTransport() {
  if (!config.smtp.host) return null;
  const auth = config.smtp.user
    ? { user: config.smtp.user, pass: config.smtp.pass }
    : undefined;
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth,
  });
}

export function isSmtpConfigured() {
  return Boolean(config.smtp.host);
}

export async function sendPasswordResetEmail(input: {
  to: string;
  resetUrl: string;
  expiresMinutes: number;
}) {
  if (!config.smtp.host) {
    if (isProduction) {
      throw new Error("SMTP is not configured");
    }
    return false;
  }

  if (!transport) {
    transport = buildTransport();
  }
  if (!transport) return false;

  const from =
    config.smtp.from || config.smtp.user || "no-reply@ford.local";

  const subject = "Ford Vision — Redefinição de senha";
  const text = [
    "Recebemos uma solicitação de redefinição de senha.",
    `Link (válido por ${input.expiresMinutes} min): ${input.resetUrl}`,
    "Se você não solicitou, ignore esta mensagem.",
  ].join("\n");

  const html = `
    <p>Recebemos uma solicitação de redefinição de senha.</p>
    <p><strong>Link (válido por ${input.expiresMinutes} min):</strong></p>
    <p><a href="${input.resetUrl}">${input.resetUrl}</a></p>
    <p>Se você não solicitou, ignore esta mensagem.</p>
  `;

  await transport.sendMail({
    from,
    to: input.to,
    subject,
    text,
    html,
  });

  return true;
}
