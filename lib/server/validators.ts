import { z } from "zod";
import { SECURITY_POLICY_LIMITS } from "./policy";

const MAX_ATTR_KEYS = 20;
const COMMAND_INJECTION_PATTERN =
  /(?:\$\(|`|&&|\|\||;(?!\s*$)|\|\s*[a-zA-Z0-9]|\b(?:cmd(?:\.exe)?|powershell(?:\.exe)?|bash|zsh|sh)\b)/i;
const MALFORMED_TEXT_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function collapseSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripDiacritics(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

export function sanitizeText(value: string) {
  return value.replace(/[<>\u0000]/g, "");
}

function containsMalformedText(value: string) {
  return MALFORMED_TEXT_PATTERN.test(value);
}

function containsCommandInjectionPattern(value: string) {
  return COMMAND_INJECTION_PATTERN.test(value);
}

function sanitizeSafeText(value: string) {
  return sanitizeText(collapseSpaces(value));
}

function isSafeText(value: string) {
  return !containsMalformedText(value) && !containsCommandInjectionPattern(value);
}

function safeTextSchema(min: number, max: number) {
  return z
    .string()
    .min(min)
    .max(max)
    .transform(sanitizeSafeText)
    .refine(isSafeText, {
      message: "Potentially unsafe input",
    });
}

function normalizeVehicleText(value: string) {
  return collapseSpaces(stripDiacritics(sanitizeText(value))).toUpperCase();
}

const usernameSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9._-]+$/)
  .transform((v) => v.trim().toLowerCase());

const emailSchema = z
  .string()
  .email()
  .max(120)
  .transform((v) => v.trim().toLowerCase());

function capitalizeNameWord(value: string) {
  const lowered = value.toLocaleLowerCase("pt-BR");
  if (lowered.length === 0) return lowered;
  return lowered.charAt(0).toLocaleUpperCase("pt-BR") + lowered.slice(1);
}

function normalizeFullName(value: string) {
  return collapseSpaces(value)
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) =>
      part
        .split("-")
        .filter((segment) => segment.length > 0)
        .map(capitalizeNameWord)
        .join("-")
    )
    .join(" ");
}

const fullNameSchema = safeTextSchema(3, 80)
  .transform(normalizeFullName)
  .refine((value) => value.split(" ").filter((part) => part.length > 0).length >= 2, {
    message: "Informe nome e sobrenome",
  });

const loginPasswordSchema = z.string().min(4).max(72);
const strongPasswordSchema = z
  .string()
  .min(12)
  .max(72)
  .refine((value) => /[a-z]/.test(value), { message: "Missing lowercase" })
  .refine((value) => /[A-Z]/.test(value), { message: "Missing uppercase" })
  .refine((value) => /\d/.test(value), { message: "Missing number" })
  .refine((value) => /[^a-zA-Z0-9]/.test(value), { message: "Missing symbol" });

const loginIdentifierSchema = z
  .string()
  .min(3)
  .max(120)
  .transform((v) => v.trim().toLowerCase())
  .refine((value) => value.includes("@") || /^[a-z0-9._-]{3,32}$/.test(value), {
    message: "Invalid identifier",
  });

export const loginSchema = z.object({
  identifier: loginIdentifierSchema.optional(),
  username: usernameSchema.optional(),
  email: emailSchema.optional(),
  password: loginPasswordSchema,
}).refine((value) => Boolean(value.identifier || value.username || value.email), {
  message: "Missing identifier",
});

export const registerSchema = z.object({
  name: fullNameSchema,
  username: usernameSchema,
  email: emailSchema,
  password: strongPasswordSchema,
});

const resetTokenSchema = z
  .string()
  .min(32)
  .max(256)
  .transform((v) => v.trim());

export const passwordForgotSchema = z.object({
  identifier: loginIdentifierSchema,
});

export const passwordResetSchema = z.object({
  token: resetTokenSchema,
  password: strongPasswordSchema,
});

export const userRoleUpdateSchema = z.object({
  role: z.enum(["usuario", "analista", "admin"]),
});

const relaxedPasswordSchema = z.string().min(4).max(72);

function emptyStringToUndefined(value: unknown) {
  if (typeof value !== "string") return value;
  return value.trim().length === 0 ? undefined : value;
}

const optionalUsernameSchema = z.preprocess(
  emptyStringToUndefined,
  usernameSchema.optional()
);

const optionalEmailSchema = z.preprocess(
  emptyStringToUndefined,
  emailSchema.optional()
);

const optionalNameSchema = z.preprocess(
  emptyStringToUndefined,
  safeTextSchema(1, 80).optional()
);

export const adminUserCreateSchema = z
  .object({
    username: optionalUsernameSchema,
    email: optionalEmailSchema,
    password: relaxedPasswordSchema,
    name: optionalNameSchema,
    role: z.enum(["usuario", "analista", "admin"]).default("usuario"),
  })
  .strict()
  .refine((value) => Boolean(value.username || value.email), {
    message: "Either username or email is required",
  });

const brandSchema = z
  .string()
  .min(2)
  .max(40)
  .transform(normalizeVehicleText)
  .pipe(z.string().regex(/^[A-Z0-9][A-Z0-9 -]{1,39}$/));

const modelSchema = z
  .string()
  .min(1)
  .max(40)
  .transform(normalizeVehicleText)
  .pipe(z.string().regex(/^[A-Z0-9][A-Z0-9 -]{0,39}$/));

const versionSchema = z
  .string()
  .min(1)
  .max(30)
  .transform(normalizeVehicleText)
  .pipe(z.string().regex(/^[A-Z0-9][A-Z0-9 .-]{0,29}$/));

const attributeKeySchema = z
  .string()
  .min(1)
  .max(30)
  .regex(/^[a-zA-Z0-9_-]+$/);

const attributeValueSchema = z.union([
  safeTextSchema(1, 60),
  z.number().finite(),
  z.boolean(),
]);

const attributesSchema = z
  .record(attributeKeySchema, attributeValueSchema)
  .refine((value) => Object.keys(value).length <= MAX_ATTR_KEYS, {
    message: "Too many attributes",
  });

const leadVehicleSchema = z.object({
  marca: brandSchema,
  modelo: modelSchema,
  versao: versionSchema,
  atributos: attributesSchema,
});

export const leadCreateSchema = z.object({
  customerName: safeTextSchema(2, 80),
  customerEmail: z.string().email().max(120).transform((v) => v.trim().toLowerCase()),
  customerPhone: z.string().min(8).max(20).regex(/^\+?[0-9]+$/),
  vehicle: leadVehicleSchema,
  serviceDueAt: z.string().datetime().optional(),
  score: z.number().min(0).max(100),
});

export const vehicleCreateSchema = z.object({
  vin: z
    .string()
    .min(11)
    .max(17)
    .transform((v) => v.trim().toUpperCase())
    .pipe(z.string().regex(/^[A-HJ-NPR-Z0-9]+$/)),
  marca: brandSchema,
  modelo: modelSchema,
  versao: versionSchema,
  atributos: attributesSchema,
});

export const maintenanceCreateSchema = z.object({
  vehicleVin: z
    .string()
    .min(11)
    .max(17)
    .transform((v) => v.trim().toUpperCase())
    .pipe(z.string().regex(/^[A-HJ-NPR-Z0-9]+$/)),
  type: safeTextSchema(2, 40),
  notes: safeTextSchema(1, 240).optional(),
  occurredAt: z.string().datetime(),
});

export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
});

export const auditQuerySchema = z.object({
  limit: z.number().min(1).max(500).default(100),
  type: z.string().min(1).max(80).optional(),
  actorId: z.string().min(1).max(120).optional(),
  actorRole: z.enum(["usuario", "analista", "admin"]).optional(),
  ip: z.string().min(1).max(64).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  format: z.enum(["json", "csv"]).optional(),
});

export const securityPolicyUpdateSchema = z
  .object({
    retentionDays: z
      .number()
      .int()
      .min(SECURITY_POLICY_LIMITS.retentionDays.min)
      .max(SECURITY_POLICY_LIMITS.retentionDays.max)
      .optional(),
    massiveQueryThreshold: z
      .number()
      .int()
      .min(SECURITY_POLICY_LIMITS.massiveQueryThreshold.min)
      .max(SECURITY_POLICY_LIMITS.massiveQueryThreshold.max)
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one policy field must be provided",
  });
