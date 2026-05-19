"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import GradientCanvas from "@/components/shared/GradientCanvas";
import { getRole } from "@/lib/auth";
import { AdminUser, fetchUsers, updateUserRole } from "@/lib/admin";

export default function AdminPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getRole().then((role) => {
      if (!active) return;
      if (!role) router.push("/");
      else if (role === "usuario") router.push("/app");
      else if (role === "analista") router.push("/command");
      else setAuthChecked(true);
    });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    let active = true;
    setLoading(true);
    fetchUsers()
      .then((items) => {
        if (active) setUsers(items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authChecked]);

  async function handleRoleChange(userId: string, role: AdminUser["role"]) {
    setUpdatingId(userId);
    const ok = await updateUserRole(userId, role);
    if (ok) {
      const refreshed = await fetchUsers();
      setUsers(refreshed);
    }
    setUpdatingId(null);
  }

  if (!authChecked) return null;

  return (
    <div className="grain min-h-screen bg-black flex flex-col relative">
      <GradientCanvas />
      <div className="fixed inset-0 hud-grid opacity-50 pointer-events-none" />
      <Navbar />

      <main className="flex-1 max-w-[1400px] mx-auto px-6 py-8 w-full relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="font-mono-tech text-[10px] uppercase tracking-[0.4em] text-ford-blue-light">
              ADMIN · 04
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-[0.08em] mt-2">
              Gestão de Usuários
            </h1>
            <p className="text-xs text-white/50 mt-2">
              Controle de papéis com trilha de auditoria.
            </p>
          </div>
          <Link
            href="/admin/audit"
            className="font-display px-4 py-2 text-[10px] uppercase tracking-[0.3em] border border-ford-blue-light text-ford-blue-light hover:bg-ford-blue-light/10"
          >
            Ver auditoria
          </Link>
        </div>

        <div className="ford-card p-4 border border-ford-blue/40 bg-black/70">
          {loading ? (
            <div className="font-mono-tech text-xs text-white/60">Carregando usuários...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] text-white/70">
                <thead className="text-[10px] uppercase tracking-[0.3em] text-white/50">
                  <tr>
                    <th className="py-3 px-2">Usuário</th>
                    <th className="py-3 px-2">E-mail</th>
                    <th className="py-3 px-2">Papel</th>
                    <th className="py-3 px-2">Criado</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-white/10">
                      <td className="py-3 px-2 font-mono-tech text-white/80">{user.username}</td>
                      <td className="py-3 px-2">{user.email}</td>
                      <td className="py-3 px-2">
                        <select
                          className="bg-black/60 border border-white/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em]"
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user.id, e.target.value as AdminUser["role"])
                          }
                          disabled={updatingId === user.id}
                        >
                          <option value="usuario">usuario</option>
                          <option value="analista">analista</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="py-3 px-2">{new Date(user.createdAt).toLocaleDateString("pt-BR")}</td>
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
