export type Role = "usuario" | "analista" | "admin";

export type User = {
  id: string;
  username: string;
  email: string;
  name?: string;
  role: Role;
  passwordHash: string;
  refreshTokenHash?: string;
  createdAt: string;
  updatedAt?: string;
};

export type UserSession = {
  id: string;
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  deviceLabel?: string;
  createdAt: string;
  lastSeenAt: string;
  revokedAt?: string;
};

export type PasswordReset = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
  requestedIp?: string;
  requestedUserAgent?: string;
};

export type Vehicle = {
  id: string;
  vin: string;
  marca: string;
  modelo: string;
  versao: string;
  atributos: Record<string, string | number | boolean>;
  createdAt: string;
};

export type Lead = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  vehicle: {
    marca: string;
    modelo: string;
    versao: string;
    atributos: Record<string, string | number | boolean>;
  };
  serviceDueAt?: string;
  score: number;
  createdAt: string;
  updatedAt: string;
};

export type MaintenanceEvent = {
  id: string;
  vehicleVin: string;
  type: string;
  notes?: string;
  occurredAt: string;
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  type: string;
  actorId?: string;
  actorRole?: Role;
  requestId: string;
  ip?: string;
  createdAt: string;
  details?: Record<string, unknown>;
};

export type Store<T> = {
  items: T[];
};
