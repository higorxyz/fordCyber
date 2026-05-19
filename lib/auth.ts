"use client";

export type Role = "usuario" | "analista" | "admin";

type SessionResponse = {
  role: Role;
  username: string;
};

type CsrfResponse = {
  token: string;
};

export type SessionInfo = {
  id: string;
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  deviceLabel?: string;
  createdAt: string;
  lastSeenAt: string;
  revokedAt?: string;
};

type SessionsResponse = {
  items: SessionInfo[];
  currentSessionId?: string;
};

let csrfTokenCache: string | null = null;

function readCsrfFromCookie() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )fv_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfToken() {
  if (csrfTokenCache) return csrfTokenCache;
  const cookieToken = readCsrfFromCookie();
  if (cookieToken) {
    csrfTokenCache = cookieToken;
    return cookieToken;
  }

  const res = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as CsrfResponse;
  csrfTokenCache = data.token;
  return data.token;
}

export async function prefetchCsrf() {
  await ensureCsrfToken();
}

export async function getCsrfToken() {
  return ensureCsrfToken();
}

export async function login(identifier: string, password: string): Promise<Role | null> {
  const csrfToken = await ensureCsrfToken();
  if (!csrfToken) return null;
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify({ identifier, password }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as SessionResponse;
  return data.role ?? null;
}

export async function register(username: string, email: string, password: string): Promise<Role | null> {
  const csrfToken = await ensureCsrfToken();
  if (!csrfToken) return null;
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as SessionResponse;
  return data.role ?? null;
}

export async function getRole(): Promise<Role | null> {
  const res = await fetch("/api/auth/session", { cache: "no-store" });
  if (res.ok) {
    const data = (await res.json()) as SessionResponse;
    return data.role ?? null;
  }

  if (res.status === 401) {
    const csrfToken = await ensureCsrfToken();
    if (!csrfToken) return null;
    const refresh = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
    });
    if (!refresh.ok) return null;
    const retry = await fetch("/api/auth/session", { cache: "no-store" });
    if (!retry.ok) return null;
    const data = (await retry.json()) as SessionResponse;
    return data.role ?? null;
  }

  return null;
}

export async function logout() {
  const csrfToken = await ensureCsrfToken();
  if (!csrfToken) return;
  await fetch("/api/auth/logout", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export async function logoutAll() {
  const csrfToken = await ensureCsrfToken();
  if (!csrfToken) return false;
  const res = await fetch("/api/auth/logout-all", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
  });
  return res.ok;
}

export async function requestPasswordReset(identifier: string) {
  const csrfToken = await ensureCsrfToken();
  if (!csrfToken) return { ok: false };
  const res = await fetch("/api/auth/forgot", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify({ identifier }),
  });
  if (!res.ok) return { ok: false };
  return (await res.json()) as { ok: boolean; previewUrl?: string };
}

export async function resetPassword(token: string, password: string) {
  const csrfToken = await ensureCsrfToken();
  if (!csrfToken) return false;
  const res = await fetch("/api/auth/reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify({ token, password }),
  });
  return res.ok;
}

export async function fetchSessions() {
  const res = await fetch("/api/auth/sessions", { cache: "no-store" });
  if (!res.ok) return { items: [], currentSessionId: undefined };
  return (await res.json()) as SessionsResponse;
}

export async function revokeSession(sessionId: string) {
  const csrfToken = await ensureCsrfToken();
  if (!csrfToken) return false;
  const res = await fetch(`/api/auth/sessions/${sessionId}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
  return res.ok;
}
