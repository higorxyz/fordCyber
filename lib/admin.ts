"use client";

import { getCsrfToken } from "./auth";

export type AdminUser = {
  id: string;
  username: string;
  email: string;
  name?: string;
  role: "usuario" | "analista" | "admin";
  createdAt: string;
  updatedAt?: string;
};

export type AuditEvent = {
  id: string;
  type: string;
  actorId?: string;
  actorRole?: AdminUser["role"];
  requestId: string;
  ip?: string;
  createdAt: string;
  details?: Record<string, unknown>;
};

export type AuditFilters = {
  limit?: number;
  type?: string;
  actorId?: string;
  actorRole?: AdminUser["role"];
  ip?: string;
  from?: string;
  to?: string;
};

export type MetricsResponse = {
  windowHours: number;
  totals: {
    events: number;
    loginFailed: number;
    authLocked: number;
    rateLimited: number;
    passwordResets: number;
    passwordResetRequests: number;
    roleChanges: number;
    sessionsRevoked: number;
  };
  topTypes: { type: string; total: number }[];
  lastEventAt: string | null;
};

export async function fetchUsers(limit = 50): Promise<AdminUser[]> {
  const res = await fetch(`/api/admin/users?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { items: AdminUser[] };
  return data.items ?? [];
}

export async function updateUserRole(userId: string, role: AdminUser["role"]) {
  const csrfToken = await getCsrfToken();
  if (!csrfToken) return false;
  const res = await fetch(`/api/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify({ role }),
  });
  return res.ok;
}

function buildQuery(filters: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  return query.length > 0 ? `?${query}` : "";
}

export async function fetchAuditEvents(filters: AuditFilters = {}): Promise<AuditEvent[]> {
  const query = buildQuery({
    limit: filters.limit ?? 100,
    type: filters.type,
    actorId: filters.actorId,
    actorRole: filters.actorRole,
    ip: filters.ip,
    from: filters.from,
    to: filters.to,
  });
  const res = await fetch(`/api/audit${query}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { items: AuditEvent[] };
  return data.items ?? [];
}

export function buildAuditCsvUrl(filters: AuditFilters = {}) {
  return `/api/audit${buildQuery({
    limit: filters.limit ?? 100,
    type: filters.type,
    actorId: filters.actorId,
    actorRole: filters.actorRole,
    ip: filters.ip,
    from: filters.from,
    to: filters.to,
    format: "csv",
  })}`;
}

export async function fetchMetrics(hours = 24): Promise<MetricsResponse | null> {
  const res = await fetch(`/api/admin/metrics?hours=${hours}`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as MetricsResponse;
}
