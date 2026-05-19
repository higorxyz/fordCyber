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

export type AdminUserCreateInput = {
  username?: string;
  email?: string;
  password: string;
  name?: string;
  role?: AdminUser["role"];
};

export type AdminUserCreateResponse = {
  user: AdminUser;
  generated: {
    username: boolean;
    email: boolean;
  };
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

export async function createAdminUser(input: AdminUserCreateInput) {
  const csrfToken = await getCsrfToken();
  if (!csrfToken) return null;
  const payload: AdminUserCreateInput = {
    password: input.password,
    role: input.role ?? "usuario",
    ...(input.username ? { username: input.username } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.name ? { name: input.name } : {}),
  };

  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  return (await res.json()) as AdminUserCreateResponse;
}

export async function deleteAdminUser(userId: string) {
  const csrfToken = await getCsrfToken();
  if (!csrfToken) return false;
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: "DELETE",
    headers: {
      "X-CSRF-Token": csrfToken,
    },
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
