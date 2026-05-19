import { hashString } from "./crypto";
import { Lead, MaintenanceEvent } from "./models";

export function anonymizeLead(lead: Lead) {
  if (lead.customerEmail.startsWith("anon+")) {
    return lead;
  }
  const hash = hashString(`${lead.id}:${lead.customerEmail}`);
  return {
    ...lead,
    customerName: "ANON",
    customerEmail: `anon+${hash.slice(0, 12)}@ford.local`,
    customerPhone: "0000000000",
  };
}

export function applyRetention(leads: Lead[], retentionDays: number) {
  const now = Date.now();
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  let anonymized = 0;
  let removed = 0;

  const kept: Lead[] = [];
  for (const lead of leads) {
    const createdAt = Date.parse(lead.createdAt);
    if (!Number.isFinite(createdAt)) {
      kept.push(lead);
      continue;
    }
    const ageMs = now - createdAt;
    if (ageMs > retentionMs * 2) {
      removed += 1;
      continue;
    }
    if (ageMs > retentionMs) {
      const maybeAnonymized = anonymizeLead(lead);
      if (maybeAnonymized !== lead) {
        anonymized += 1;
      }
      kept.push(maybeAnonymized);
      continue;
    }
    kept.push(lead);
  }

  return { kept, anonymized, removed };
}

export function anonymizeMaintenanceEvent(event: MaintenanceEvent) {
  if (event.vehicleVin.startsWith("ANONVIN-") && (!event.notes || event.notes === "[redacted]")) {
    return event;
  }
  const vinHash = hashString(`${event.id}:${event.vehicleVin}`).slice(0, 12).toUpperCase();
  return {
    ...event,
    vehicleVin: `ANONVIN-${vinHash}`,
    notes: event.notes ? "[redacted]" : undefined,
  };
}

export function applyMaintenanceRetention(events: MaintenanceEvent[], retentionDays: number) {
  const now = Date.now();
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  let anonymized = 0;
  let removed = 0;

  const kept: MaintenanceEvent[] = [];
  for (const event of events) {
    const createdAt = Date.parse(event.createdAt);
    if (!Number.isFinite(createdAt)) {
      kept.push(event);
      continue;
    }
    const ageMs = now - createdAt;
    if (ageMs > retentionMs * 2) {
      removed += 1;
      continue;
    }
    if (ageMs > retentionMs) {
      const maybeAnonymized = anonymizeMaintenanceEvent(event);
      if (maybeAnonymized !== event) {
        anonymized += 1;
      }
      kept.push(maybeAnonymized);
      continue;
    }
    kept.push(event);
  }

  return { kept, anonymized, removed };
}
