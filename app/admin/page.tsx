"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import GradientCanvas from "@/components/shared/GradientCanvas";
import { getRole } from "@/lib/auth";
import { maskEmailAddress } from "@/lib/ip";
import {
  AdminUser,
  createAdminUser,
  deleteAdminUser,
  fetchUsers,
  updateUserRole,
} from "@/lib/admin";

type Notice = {
  kind: "success" | "error";
  text: string;
};

const EMPTY_FORM = {
  username: "",
  email: "",
  password: "",
  name: "",
  role: "usuario" as AdminUser["role"],
};

export default function AdminPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [notice, setNotice] = useState<Notice | null>(null);

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
    setNotice(null);
    const result = await updateUserRole(userId, role);
    if (!result.ok) {
      setNotice({ kind: "error", text: result.message });
      setUpdatingId(null);
      return;
    }
    setNotice({ kind: "success", text: "Papel atualizado com sucesso." });
    const refreshed = await fetchUsers();
    setUsers(refreshed);
    setUpdatingId(null);
  }

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    if (creating) return;

    const username = form.username.trim().toLowerCase();
    const email = form.email.trim().toLowerCase();
    const password = form.password.trim();
    const name = form.name.trim();

    if (!username && !email) {
      setNotice({
        kind: "error",
        text: "Informe ao menos username ou e-mail para criar o usuário.",
      });
      return;
    }
    if (password.length < 4) {
      setNotice({ kind: "error", text: "A senha deve ter no mínimo 4 caracteres." });
      return;
    }

    setCreating(true);
    setNotice(null);
    const result = await createAdminUser({
      username: username || undefined,
      email: email || undefined,
      password,
      name: name || undefined,
      role: form.role,
    });
    setCreating(false);

    if (!result.ok) {
      setNotice({ kind: "error", text: result.message });
      return;
    }
    const created = result.data;

    const generatedParts: string[] = [];
    if (created.generated.username) {
      generatedParts.push(`username gerado: ${created.user.username}`);
    }
    if (created.generated.email) {
      generatedParts.push(`e-mail gerado: ${maskEmailAddress(created.user.email)}`);
    }
    const generatedText =
      generatedParts.length > 0 ? ` ${generatedParts.join(" · ")}` : "";

    setNotice({
      kind: "success",
      text: `Usuário criado com sucesso.${generatedText}`,
    });
    setForm(EMPTY_FORM);
    const refreshed = await fetchUsers();
    setUsers(refreshed);
  }

  async function handleDeleteUser(user: AdminUser) {
    const confirmed = window.confirm(
      `Excluir o usuário ${user.username}? Esta ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    setDeletingId(user.id);
    setNotice(null);
    const result = await deleteAdminUser(user.id);
    setDeletingId(null);

    if (!result.ok) {
      setNotice({ kind: "error", text: result.message });
      return;
    }

    setNotice({ kind: "success", text: "Usuário excluído com sucesso." });
    const refreshed = await fetchUsers();
    setUsers(refreshed);
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

        <div className="ford-card p-4 border border-ford-blue/40 bg-black/70 mb-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 mb-2">
            Criar usuário (admin)
          </div>
          <p className="text-[11px] text-white/60 mb-4">
            Para criação via admin: informe ao menos username ou e-mail e senha
            com mínimo de 4 caracteres.
          </p>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={form.username}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, username: e.target.value }))
                }
                placeholder="Username (opcional se e-mail preenchido)"
                className="bg-black/60 border border-white/20 px-3 py-2 text-[11px]"
              />
              <input
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="E-mail (opcional se username preenchido)"
                className="bg-black/60 border border-white/20 px-3 py-2 text-[11px]"
              />
              <input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder="Senha (mínimo 4 caracteres)"
                className="bg-black/60 border border-white/20 px-3 py-2 text-[11px]"
              />
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Nome (opcional)"
                className="bg-black/60 border border-white/20 px-3 py-2 text-[11px]"
              />
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <select
                value={form.role}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    role: e.target.value as AdminUser["role"],
                  }))
                }
                className="bg-black/60 border border-white/20 px-3 py-2 text-[11px] uppercase tracking-[0.2em]"
              >
                <option value="usuario">usuario</option>
                <option value="analista">analista</option>
                <option value="admin">admin</option>
              </select>

              <button
                type="submit"
                disabled={creating}
                className="font-display px-4 py-2 text-[10px] uppercase tracking-[0.3em] border border-ford-blue-light text-ford-blue-light hover:bg-ford-blue-light/10 disabled:opacity-50"
              >
                {creating ? "Criando..." : "Criar usuário"}
              </button>
            </div>
          </form>

          {notice && (
            <div
              className={`mt-4 text-[11px] ${
                notice.kind === "success" ? "text-green-400" : "text-ford-red"
              }`}
            >
              {notice.text}
            </div>
          )}
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
                    <th className="py-3 px-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-white/10">
                      <td className="py-3 px-2 font-mono-tech text-white/80">{user.username}</td>
                      <td className="py-3 px-2">{maskEmailAddress(user.email)}</td>
                      <td className="py-3 px-2">
                        <select
                          className="bg-black/60 border border-white/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em]"
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user.id, e.target.value as AdminUser["role"])
                          }
                          disabled={updatingId === user.id || deletingId === user.id}
                        >
                          <option value="usuario">usuario</option>
                          <option value="analista">analista</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="py-3 px-2">{new Date(user.createdAt).toLocaleDateString("pt-BR")}</td>
                      <td className="py-3 px-2">
                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={deletingId === user.id || updatingId === user.id}
                          className="font-display text-[9px] uppercase tracking-[0.3em] text-ford-red hover:text-ford-red-dark disabled:opacity-50"
                        >
                          {deletingId === user.id ? "Excluindo..." : "Excluir"}
                        </button>
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
