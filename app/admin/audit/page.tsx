"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import GradientCanvas from "@/components/shared/GradientCanvas";
import { AuditEvent, AuditFilters, buildAuditCsvUrl, fetchAuditEvents, fetchMetrics, MetricsResponse } from "@/lib/admin";
import { getRole } from "@/lib/auth";
import { maskIpAddress } from "@/lib/ip";

type FilterState = {
  type: string;
  actorId: string;
  actorRole: string;
  ip: string;
  from: string;
  to: string;
  limit: string;
};

export default function AdminAuditPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    type: "",
    actorId: "",
    actorRole: "",
    ip: "",
    from: "",
    to: "",
    limit: "100",
  });

  useEffect(() => {
    let active = true;
    getRole().then((role) => {
      if (!active) return;
      if (!role) router.push("/");
      else if (role !== "admin") router.push("/app");
      else setAuthChecked(true);
    });
    return () => {
      active = false;
    };
  }, [router]);

  const normalizedFilters = useMemo<AuditFilters>(() => {
    const limit = Number.parseInt(filters.limit, 10);
    return {
      limit: Number.isFinite(limit) ? limit : 100,
      type: filters.type || undefined,
      actorId: filters.actorId || undefined,
      actorRole: (filters.actorRole || undefined) as AuditFilters["actorRole"],
      ip: filters.ip || undefined,
      from: filters.from ? new Date(filters.from).toISOString() : undefined,
      to: filters.to ? new Date(filters.to).toISOString() : undefined,
    };
  }, [filters]);

  useEffect(() => {
    if (!authChecked) return;
    let active = true;
    Promise.all([fetchAuditEvents(normalizedFilters), fetchMetrics(24)])
      .then(([items, metrics]) => {
        if (!active) return;
        setEvents(items);
        setMetrics(metrics);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authChecked, normalizedFilters]);

  function updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  if (!authChecked) return null;

  return (
    <div className="grain min-h-screen bg-black flex flex-col relative">
      <GradientCanvas />
      <div className="fixed inset-0 hud-grid opacity-50 pointer-events-none" />
      <Navbar />

      <main className="flex-1 max-w-[1400px] mx-auto px-4 sm:px-6 py-6 md:py-8 w-full relative z-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <div className="font-mono-tech text-[10px] uppercase tracking-[0.4em] text-ford-blue-light">
              ADMIN · AUDIT
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-[0.08em] mt-2">
              Trilhas de Auditoria
            </h1>
            <p className="text-xs text-white/50 mt-2">
              Inspecione eventos críticos com filtros e exportação.
            </p>
          </div>
          <a
            href={buildAuditCsvUrl(normalizedFilters)}
            className="font-display w-full sm:w-auto text-center px-4 py-2 text-[10px] uppercase tracking-[0.3em] border border-ford-blue-light text-ford-blue-light hover:bg-ford-blue-light/10"
          >
            Exportar CSV
          </a>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="ford-card p-4 border border-ford-blue/40 bg-black/70">
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">Eventos (24h)</div>
            <div className="text-2xl font-display text-white mt-2">
              {metrics?.totals.events ?? "--"}
            </div>
            <div className="text-[10px] text-white/40 mt-1">
              Último: {metrics?.lastEventAt ? new Date(metrics.lastEventAt).toLocaleString("pt-BR") : "--"}
            </div>
          </div>
          <div className="ford-card p-4 border border-ford-blue/40 bg-black/70">
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">Falhas de auth</div>
            <div className="text-2xl font-display text-white mt-2">
              {metrics ? metrics.totals.loginFailed + metrics.totals.authLocked : "--"}
            </div>
            <div className="text-[10px] text-white/40 mt-1">
              Rate limit: {metrics?.totals.rateLimited ?? "--"}
            </div>
          </div>
          <div className="ford-card p-4 border border-ford-blue/40 bg-black/70">
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">Sessões &amp; reset</div>
            <div className="text-2xl font-display text-white mt-2">
              {metrics ? metrics.totals.sessionsRevoked : "--"}
            </div>
            <div className="text-[10px] text-white/40 mt-1">
              Reset concluídos: {metrics?.totals.passwordResets ?? "--"}
            </div>
          </div>
        </div>

        <div className="ford-card p-4 border border-ford-blue/40 bg-black/70 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px] uppercase tracking-[0.3em]">
            <input
              value={filters.type}
              onChange={(e) => updateFilter("type", e.target.value)}
              placeholder="Tipo"
              className="bg-black/60 border border-white/20 px-2 py-2 text-[10px] uppercase tracking-[0.2em]"
            />
            <input
              value={filters.actorId}
              onChange={(e) => updateFilter("actorId", e.target.value)}
              placeholder="Actor ID"
              className="bg-black/60 border border-white/20 px-2 py-2 text-[10px] uppercase tracking-[0.2em]"
            />
            <select
              value={filters.actorRole}
              onChange={(e) => updateFilter("actorRole", e.target.value)}
              className="bg-black/60 border border-white/20 px-2 py-2 text-[10px] uppercase tracking-[0.2em]"
            >
              <option value="">Role</option>
              <option value="usuario">usuario</option>
              <option value="analista">analista</option>
              <option value="admin">admin</option>
            </select>
            <input
              value={filters.ip}
              onChange={(e) => updateFilter("ip", e.target.value)}
              placeholder="IP"
              className="bg-black/60 border border-white/20 px-2 py-2 text-[10px] uppercase tracking-[0.2em]"
            />
            <input
              value={filters.limit}
              onChange={(e) => updateFilter("limit", e.target.value)}
              placeholder="Limite"
              className="bg-black/60 border border-white/20 px-2 py-2 text-[10px] uppercase tracking-[0.2em]"
            />
            <input
              type="datetime-local"
              value={filters.from}
              onChange={(e) => updateFilter("from", e.target.value)}
              className="bg-black/60 border border-white/20 px-2 py-2 text-[10px] uppercase tracking-[0.2em]"
            />
            <input
              type="datetime-local"
              value={filters.to}
              onChange={(e) => updateFilter("to", e.target.value)}
              className="bg-black/60 border border-white/20 px-2 py-2 text-[10px] uppercase tracking-[0.2em]"
            />
          </div>
        </div>

        <div className="ford-card p-4 border border-ford-blue/40 bg-black/70">
          {loading ? (
            <div className="font-mono-tech text-xs text-white/60">Carregando auditoria...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] text-white/70">
                <thead className="text-[10px] uppercase tracking-[0.3em] text-white/50">
                  <tr>
                    <th className="py-3 px-2">Evento</th>
                    <th className="py-3 px-2">Actor</th>
                    <th className="py-3 px-2">IP</th>
                    <th className="py-3 px-2">Data</th>
                    <th className="py-3 px-2">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-t border-white/10">
                      <td className="py-3 px-2 font-mono-tech text-white/80">{event.type}</td>
                      <td className="py-3 px-2">
                        <div>{event.actorId ?? "--"}</div>
                        <div className="text-[9px] text-white/40 uppercase">{event.actorRole ?? ""}</div>
                      </td>
                      <td className="py-3 px-2">{maskIpAddress(event.ip)}</td>
                      <td className="py-3 px-2">
                        {new Date(event.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 px-2 text-[9px] text-white/40">
                        {event.details ? JSON.stringify(event.details) : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
