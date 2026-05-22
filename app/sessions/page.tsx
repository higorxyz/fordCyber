"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import GradientCanvas from "@/components/shared/GradientCanvas";
import { fetchSessions, getRole, logoutAll, revokeSession, SessionInfo } from "@/lib/auth";
import { maskIpAddress } from "@/lib/ip";

export default function SessionsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getRole().then((role) => {
      if (!active) return;
      if (!role) router.push("/");
      else setAuthChecked(true);
    });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    let active = true;
    fetchSessions()
      .then((data) => {
        if (!active) return;
        setSessions(data.items);
        setCurrentSessionId(data.currentSessionId);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authChecked]);

  async function handleRevoke(sessionId: string) {
    setActionId(sessionId);
    const ok = await revokeSession(sessionId);
    if (ok) {
      if (sessionId === currentSessionId) {
        router.replace("/");
        return;
      }
      const data = await fetchSessions();
      setSessions(data.items);
      setCurrentSessionId(data.currentSessionId);
    }
    setActionId(null);
  }

  async function handleLogoutAll() {
    setActionId("all");
    const ok = await logoutAll();
    if (ok) {
      router.push("/");
    }
    setActionId(null);
  }

  if (!authChecked) return null;

  return (
    <div className="grain min-h-screen bg-black flex flex-col relative">
      <GradientCanvas />
      <div className="fixed inset-0 hud-grid opacity-50 pointer-events-none" />
      <Navbar />

      <main className="flex-1 max-w-[1200px] mx-auto px-4 sm:px-6 py-6 md:py-8 w-full relative z-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <div className="font-mono-tech text-[10px] uppercase tracking-[0.4em] text-ford-blue-light">
              SEGURANÇA · 05
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-[0.08em] mt-2">
              Sessões Ativas
            </h1>
            <p className="text-xs text-white/50 mt-2">
              Revogue dispositivos suspeitos ou finalize todas as sessões.
            </p>
          </div>
          <button
            onClick={handleLogoutAll}
            disabled={actionId === "all"}
            className="font-display w-full sm:w-auto px-4 py-2 text-[10px] uppercase tracking-[0.3em] border border-ford-red text-ford-red hover:bg-ford-red/10"
          >
            {actionId === "all" ? "PROCESSANDO..." : "Logout geral"}
          </button>
        </div>

        <div className="ford-card p-4 border border-ford-blue/40 bg-black/70">
          {loading ? (
            <div className="font-mono-tech text-xs text-white/60">Carregando sessões...</div>
          ) : sessions.length === 0 ? (
            <div className="font-mono-tech text-xs text-white/60">Nenhuma sessão ativa.</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-[11px] text-white/70">
                  <thead className="text-[10px] uppercase tracking-[0.3em] text-white/50">
                    <tr>
                      <th className="py-3 px-2">Dispositivo</th>
                      <th className="py-3 px-2">IP</th>
                      <th className="py-3 px-2">Último acesso</th>
                      <th className="py-3 px-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => {
                      const isCurrent = session.id === currentSessionId;
                      return (
                        <tr key={session.id} className="border-t border-white/10">
                          <td className="py-3 px-2">
                            <div className="font-mono-tech text-white/80">
                              {session.deviceLabel || "Sessão web"}
                              {isCurrent && (
                                <span className="ml-2 text-[9px] text-ford-blue-light uppercase">atual</span>
                              )}
                            </div>
                            <div className="text-[9px] text-white/40 break-all">
                              {session.userAgent || "User-Agent indisponível"}
                            </div>
                          </td>
                          <td className="py-3 px-2">{maskIpAddress(session.ipAddress)}</td>
                          <td className="py-3 px-2">{new Date(session.lastSeenAt).toLocaleString("pt-BR")}</td>
                          <td className="py-3 px-2">
                            <button
                              onClick={() => handleRevoke(session.id)}
                              disabled={actionId === session.id}
                              className="font-display text-[9px] uppercase tracking-[0.3em] text-white/70 hover:text-ford-red"
                            >
                              {actionId === session.id ? "Revogando..." : "Revogar"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {sessions.map((session) => {
                  const isCurrent = session.id === currentSessionId;
                  return (
                    <div key={session.id} className="border border-white/10 rounded-sm p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-mono-tech text-xs text-white/80">
                          {session.deviceLabel || "Sessão web"}
                          {isCurrent && (
                            <span className="ml-2 text-[9px] text-ford-blue-light uppercase">atual</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRevoke(session.id)}
                          disabled={actionId === session.id}
                          className="font-display text-[9px] uppercase tracking-[0.25em] text-white/60 hover:text-ford-red shrink-0"
                        >
                          {actionId === session.id ? "..." : "Revogar"}
                        </button>
                      </div>
                      <div className="text-[9px] text-white/40 break-all">{session.userAgent || "User-Agent indisponível"}</div>
                      <div className="flex items-center gap-3 text-[10px] text-white/50">
                        <span>{maskIpAddress(session.ipAddress)}</span>
                        <span className="text-white/20">·</span>
                        <span>{new Date(session.lastSeenAt).toLocaleString("pt-BR")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
