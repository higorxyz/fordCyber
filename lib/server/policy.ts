import { config } from "./config";
import { loadStore, saveStore } from "./secureStore";

export type SecurityPolicy = {
  retentionDays: number;
  massiveQueryThreshold: number;
  updatedAt: string;
  updatedBy: string;
};

export const SECURITY_POLICY_LIMITS = {
  retentionDays: { min: 30, max: 3650 },
  massiveQueryThreshold: { min: 10, max: 500 },
};

const POLICY_STORE = "security_policy";

function defaultPolicy(): SecurityPolicy {
  return {
    retentionDays: 365,
    massiveQueryThreshold: config.massiveQueryThreshold,
    updatedAt: new Date().toISOString(),
    updatedBy: "system",
  };
}

export function getSecurityPolicy() {
  return loadStore<SecurityPolicy>(POLICY_STORE, defaultPolicy());
}

export async function updateSecurityPolicy(
  updates: Partial<Pick<SecurityPolicy, "retentionDays" | "massiveQueryThreshold">>,
  actorId: string
) {
  const current = await getSecurityPolicy();
  const next: SecurityPolicy = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy: actorId,
  };
  await saveStore(POLICY_STORE, next);
  return { previous: current, current: next };
}
