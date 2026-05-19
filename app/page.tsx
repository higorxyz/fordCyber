"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import FordLogo from "@/components/shared/FordLogo";
import { login, prefetchCsrf, register } from "@/lib/auth";

const BOOT_LINES: {
  text: string;
  status?: string;
  delay: number;
  type: string;
}[] = [
  { text: "FORD VISION SYSTEM v2.6", delay: 200, type: "header" },
  { text: "INITIALIZING SECURE TERMINAL...", delay: 600, type: "info" },
  { text: "PROGRESS", delay: 1000, type: "progress" },
  { text: "Neural Engine", status: "ONLINE", delay: 1800, type: "check" },
  { text: "Vehicle Telemetry", status: "CONNECTED", delay: 2100, type: "check" },
  { text: "Predictive Models", status: "LOADED", delay: 2400, type: "check" },
  { text: "Dealer Network", status: "SYNCED", delay: 2700, type: "check" },
  { text: "Inventory Tracking", status: "ACTIVE", delay: 3000, type: "check" },
  { text: "", delay: 3300, type: "blank" },
  { text: "SYSTEM READY", delay: 3500, type: "ready" },
  { text: "AWAITING AUTHENTICATION...", delay: 3800, type: "info" },
];
const SHOW_DEMO_HINTS = process.env.NODE_ENV !== "production";

function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    BOOT_LINES.forEach((line, i) => {
      timers.push(
        setTimeout(() => {
          setVisibleLines((prev) => [...prev, i]);
        }, line.delay)
      );
    });
    timers.push(
      setTimeout(() => {
        onComplete();
      }, 4300)
    );
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <motion.div
      key="boot"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
    >
      <div className="font-mono-tech text-sm space-y-2 max-w-md w-full px-6">
        {BOOT_LINES.map((line, i) => {
          if (!visibleLines.includes(i)) return null;

          if (line.type === "header") {
            return (
              <div key={i} className="boot-line text-white font-bold text-base">
                {line.text}
              </div>
            );
          }

          if (line.type === "info") {
            return (
              <div key={i} className="boot-line text-white/70">
                {line.text}
              </div>
            );
          }

          if (line.type === "progress") {
            return (
              <div key={i} className="boot-line py-2">
                <div className="w-64 h-1 border border-white/20">
                  <div
                    className="h-full bg-[#0068d6]"
                    style={{
                      animation: "progressFill 1.2s ease-out forwards",
                    }}
                  />
                </div>
              </div>
            );
          }

          if (line.type === "check") {
            const dots = ".".repeat(
              Math.max(1, 24 - (line.text?.length || 0))
            );
            return (
              <div key={i} className="boot-line flex">
                <span className="text-[#00C853]">✓</span>
                <span className="text-white/80 ml-2">{line.text}</span>
                <span className="text-white/40">{dots}</span>
                <span className="text-[#0068d6] font-bold">{line.status}</span>
              </div>
            );
          }

          if (line.type === "blank") {
            return <div key={i} className="boot-line h-4" />;
          }

          if (line.type === "ready") {
            return (
              <div
                key={i}
                className="boot-line text-[#00C853] font-bold text-base"
              >
                {line.text}
              </div>
            );
          }

          return null;
        })}
      </div>
    </motion.div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [particles, setParticles] = useState<
    { left: string; delay: string; duration: string }[]
  >([]);

  useEffect(() => {
    const arr = Array.from({ length: 25 }).map(() => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${8 + Math.random() * 8}s`,
    }));
    setParticles(arr);
  }, []);

  useEffect(() => {
    prefetchCsrf();
  }, []);

  const handleBootComplete = useCallback(() => {
    setBooting(false);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const role =
      mode === "login"
        ? await login(user.trim(), pass.trim())
        : await register(user.trim(), email.trim(), pass.trim());
    setLoading(false);
    if (!role) {
      setError(true);
      setTimeout(() => setError(false), 500);
      return;
    }
    if (role === "usuario") router.push("/app");
    else router.push("/command");
  }

  return (
    <main className="scanline grain relative min-h-screen w-full overflow-hidden bg-black flex flex-col items-center justify-center px-4">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-25"
        poster=""
      >
        <source
          src="https://cdn.pixabay.com/video/2020/07/30/45469-445072030_large.mp4"
          type="video/mp4"
        />
      </video>
      <div className="absolute inset-0 bg-black/70" />

      <AnimatePresence mode="wait">
        {booting && <BootSequence onComplete={handleBootComplete} />}
      </AnimatePresence>
      {!booting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="contents"
        >
          <div className="absolute inset-0 hud-grid opacity-70" />
          <div className="absolute inset-0 hud-grid-fine opacity-40" />

          <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ford-blue-light/20 to-transparent" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-ford-blue-light/20 to-transparent" />

          <div className="absolute top-6 left-6 w-8 h-8 border-l-2 border-t-2 border-ford-blue-light/70" />
          <div className="absolute top-6 right-6 w-8 h-8 border-r-2 border-t-2 border-ford-blue-light/70" />
          <div className="absolute bottom-6 left-6 w-8 h-8 border-l-2 border-b-2 border-ford-blue-light/70" />
          <div className="absolute bottom-6 right-6 w-8 h-8 border-r-2 border-b-2 border-ford-blue-light/70" />

          <div className="absolute top-8 left-1/2 -translate-x-1/2 label-tech text-center">
            SECURE TERMINAL · v2.6 · NODE 0xVISION
          </div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 label-tech text-center">
            FORD MOTOR COMPANY · AUTHORIZED ACCESS ONLY
          </div>

          <div className="absolute inset-0 pointer-events-none">
            {particles.map((p, i) => (
              <span
                key={i}
                className="particle"
                style={{
                  left: p.left,
                  bottom: "-10px",
                  animationDelay: p.delay,
                  animationDuration: p.duration,
                }}
              />
            ))}
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] pointer-events-none">
            {[0, 1.3, 2.6].map((d, i) => (
              <div
                key={i}
                className="radar-ring scan"
                style={{
                  width: 360,
                  height: 360,
                  top: -180,
                  left: -180,
                  animationDelay: `${d}s`,
                }}
              />
            ))}
            <div
              className="radar-ring"
              style={{ width: 360, height: 360, top: -180, left: -180 }}
            />
            <div
              className="radar-ring"
              style={{ width: 460, height: 460, top: -230, left: -230 }}
            />
          </div>

          <div className="absolute inset-0 vignette" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="relative z-10 flex flex-col items-center"
          >
            <FordLogo width={250} />

            <motion.h1
              initial={{ opacity: 0, letterSpacing: "0.05em" }}
              animate={{ opacity: 1, letterSpacing: "0.25em" }}
              transition={{ delay: 1.2, duration: 1 }}
              className="vision-text mt-4 text-[80px] md:text-[100px] leading-none"
            >
              VISION
            </motion.h1>

            <svg
              viewBox="0 0 600 80"
              className="w-[420px] md:w-[520px] h-16 mt-2"
            >
              <path
                className="ecg-path"
                d="M 0 40 L 80 40 L 100 40 L 115 20 L 130 60 L 145 10 L 160 70 L 175 40 L 260 40 L 280 40 L 295 25 L 310 55 L 325 15 L 340 65 L 355 40 L 440 40 L 460 40 L 475 25 L 490 55 L 505 15 L 520 65 L 535 40 L 600 40"
              />
            </svg>

            <p className="font-display mt-4 text-[10px] tracking-[0.5em] text-ford-red/90 uppercase">
              Retenção Inteligente · Do Veículo ao Serviço
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            onSubmit={handleSubmit}
            className={`relative z-10 mt-12 w-full max-w-sm space-y-4 ${
              error ? "shake" : ""
            }`}
          >
            <div>
              <label className="font-display block text-[10px] tracking-[0.3em] uppercase text-white/60 mb-2">
                <span className="text-ford-blue-light">[01]</span>{" "}
                {mode === "login" ? "Usuário ou e-mail" : "Usuário"}
              </label>
              <input
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="font-mono-tech w-full bg-transparent border-b border-white/30 focus:border-ford-blue-light focus:outline-none py-2 text-white placeholder-white/25 transition-colors"
                placeholder={
                  mode === "login"
                    ? "seu-usuario ou email@ford.com"
                    : "seu-usuario"
                }
                autoComplete="off"
              />
            </div>
            {mode === "register" && (
              <div>
                <label className="font-display block text-[10px] tracking-[0.3em] uppercase text-white/60 mb-2">
                  <span className="text-ford-blue-light">[02]</span> E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="font-mono-tech w-full bg-transparent border-b border-white/30 focus:border-ford-blue-light focus:outline-none py-2 text-white placeholder-white/25 transition-colors"
                  placeholder="email@ford.com"
                  autoComplete="off"
                />
              </div>
            )}
            <div>
              <label className="font-display block text-[10px] tracking-[0.3em] uppercase text-white/60 mb-2">
                <span className="text-ford-blue-light">
                  {mode === "login" ? "[02]" : "[03]"}
                </span>{" "}
                Senha
              </label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="font-mono-tech w-full bg-transparent border-b border-white/30 focus:border-ford-blue-light focus:outline-none py-2 text-white placeholder-white/25 transition-colors"
                placeholder="••••••"
                autoComplete="off"
              />
            </div>
            {error && (
              <p className="font-display text-ford-red text-xs tracking-[0.2em] uppercase">
                ⚠ Credenciais inválidas — acesso negado
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="font-display w-full mt-6 py-3 bg-ford-red hover:bg-ford-red-dark text-white font-bold tracking-[0.4em] uppercase text-sm transition-colors duration-200 border border-ford-red hover:border-ford-red-dark relative group"
              style={{
                boxShadow: "0 0 30px rgba(196,30,58,0.4)",
                clipPath:
                  "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
              }}
            >
              ▸{" "}
              {loading
                ? mode === "login"
                  ? "AUTENTICANDO..."
                  : "CRIANDO..."
                : mode === "login"
                ? "Iniciar Sessão"
                : "Criar Conta"}
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="font-mono-tech w-full text-[10px] text-white/50 uppercase tracking-[0.3em] mt-2 hover:text-white transition-colors"
            >
              {mode === "login" ? "Criar conta" : "Já tenho conta"}
            </button>
            {mode === "login" && (
              <button
                type="button"
                onClick={() => router.push("/reset")}
                className="font-mono-tech w-full text-[9px] text-white/40 uppercase tracking-[0.3em] hover:text-ford-blue-light transition-colors"
              >
                Esqueci minha senha
              </button>
            )}
            {SHOW_DEMO_HINTS && (
              <div className="font-mono-tech text-[10px] text-white/40 text-center pt-4 space-y-1">
                <div>cliente / cliente → /app</div>
                <div>analista / analista → /command</div>
                <div>gerente / gerente → /command</div>
              </div>
            )}
          </motion.form>
        </motion.div>
      )}
    </main>
  );
}
