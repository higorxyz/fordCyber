"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FordLogo from "@/components/shared/FordLogo";
import { prefetchCsrf, requestPasswordReset, resetPassword } from "@/lib/auth";

function ResetContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = useMemo(() => params.get("token") ?? "", [params]);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    prefetchCsrf();
  }, []);

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const result = await requestPasswordReset(identifier.trim().toLowerCase());
    setLoading(false);
    if (!result.ok) {
      setError("Não foi possível enviar o link agora.");
      return;
    }
    setPreviewUrl(result.previewUrl ?? null);
    setSuccess("Se o usuário existir, você receberá um link seguro.");
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setSuccess(null);
    if (!password || password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setLoading(true);
    const ok = await resetPassword(token, password.trim());
    setLoading(false);
    if (!ok) {
      setError("Token inválido ou expirado.");
      return;
    }
    setSuccess("Senha redefinida. Faça login novamente.");
    setTimeout(() => router.push("/"), 1500);
  }

  return (
    <main className="scanline grain relative min-h-screen w-full overflow-hidden bg-black flex flex-col items-center justify-center px-4">
      <div className="absolute inset-0 hud-grid opacity-60" />
      <div className="absolute inset-0 vignette" />
      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <FordLogo width={200} />
          <div className="font-display text-white text-sm tracking-[0.4em] mt-4 uppercase">
            Reset Seguro
          </div>
        </div>

        <div className="ford-card border border-ford-blue/40 bg-black/70 p-6 space-y-4">
          {!token && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="text-xs text-white/60">
                Informe usuário ou e-mail. Enviaremos um link temporário.
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="font-mono-tech w-full bg-transparent border-b border-white/30 focus:border-ford-blue-light focus:outline-none py-2 text-white placeholder-white/25"
                placeholder="usuario ou email@ford.com"
              />
              <button
                type="submit"
                disabled={loading}
                className="font-display w-full py-2 bg-ford-blue-light text-black font-bold tracking-[0.3em] uppercase text-[11px]"
              >
                {loading ? "ENVIANDO..." : "Enviar link"}
              </button>
            </form>
          )}

          {token && (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="text-xs text-white/60">
                Defina uma nova senha forte (mín. 12 caracteres).
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-mono-tech w-full bg-transparent border-b border-white/30 focus:border-ford-blue-light focus:outline-none py-2 text-white placeholder-white/25"
                placeholder="Nova senha"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="font-mono-tech w-full bg-transparent border-b border-white/30 focus:border-ford-blue-light focus:outline-none py-2 text-white placeholder-white/25"
                placeholder="Confirmar senha"
              />
              <button
                type="submit"
                disabled={loading}
                className="font-display w-full py-2 bg-ford-red text-white font-bold tracking-[0.3em] uppercase text-[11px]"
              >
                {loading ? "PROCESSANDO..." : "Redefinir senha"}
              </button>
            </form>
          )}

          {error && (
            <div className="text-xs text-ford-red tracking-[0.2em] uppercase">
              {error}
            </div>
          )}
          {success && (
            <div className="text-xs text-ford-blue-light tracking-[0.2em] uppercase">
              {success}
            </div>
          )}
          {previewUrl && (
            <div className="text-[10px] text-white/50 break-all">
              Link dev:{" "}
              <a href={previewUrl} className="text-ford-blue-light underline">
                {previewUrl}
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ResetPage() {
  return (
    <Suspense
      fallback={
        <main className="scanline grain relative min-h-screen w-full overflow-hidden bg-black flex items-center justify-center">
          <div className="font-mono-tech text-xs text-white/60">
            Carregando...
          </div>
        </main>
      }
    >
      <ResetContent />
    </Suspense>
  );
}
