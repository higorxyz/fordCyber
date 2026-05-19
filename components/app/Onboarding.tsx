"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Zap, Shield, Bell, Car, ChevronRight, Sparkles, PartyPopper } from "lucide-react";

interface Props {
  onFinish: () => void;
}

const STEPS = [
  {
    icon: Car,
    title: "Sua Ranger está conectada",
    sub: "SYNC ativo · Telemetria em tempo real",
  },
  {
    icon: Shield,
    title: "Proteção Vision ativada",
    sub: "Monitoramento inteligente 24/7",
  },
  {
    icon: Zap,
    title: "Manutenção preditiva",
    sub: "IA prevê quando seu carro precisa de cuidado",
  },
  {
    icon: Bell,
    title: "Alertas personalizados",
    sub: "Notificações sob medida para você",
  },
];

export default function Onboarding({ onFinish }: Props) {
  const [phase, setPhase] = useState<"idle" | "notification" | "welcome" | "reveal">("idle");
  const [currentStep, setCurrentStep] = useState(-1);

  useEffect(() => {
    const t = setTimeout(() => setPhase("notification"), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "reveal") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setCurrentStep(i), 600 + i * 800));
    });
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  const handleNotifClick = () => {
    setPhase("welcome");
  };

  return (
    <div className="relative h-full flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full opacity-20 animate-pulse"
          style={{
            background: "radial-gradient(circle, rgba(0,104,214,0.4) 0%, transparent 70%)",
          }}
        />
      </div>

      <AnimatePresence>
        {(phase === "idle" || phase === "notification") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-10 backdrop-blur-md bg-black/40"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(phase === "idle" || phase === "notification") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="font-mono-tech text-[32px] text-white/80 font-bold tabular-nums">
                9:41
              </div>
              <div className="font-mono-tech text-[10px] text-white/30 uppercase tracking-[0.3em]">
                Segunda-feira, 14 de Abril
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "notification" && (
          <motion.div
            initial={{ y: -120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -120, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 250 }}
            onClick={handleNotifClick}
            className="absolute top-4 left-4 right-4 z-30 bg-[#1a1a1a] border border-white/10 rounded-2xl p-3 shadow-2xl cursor-pointer active:scale-[0.98] transition-transform"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white">Ford Vision</span>
                  <span className="text-[9px] text-white/40">agora</span>
                </div>
                <p className="text-[11px] text-white/80 mt-0.5 leading-relaxed">
                  Olá Rafael! 🎉 Sua Ford Ranger está pronta. Toque para ativar seu Ford Vision e começar o tour digital!
                </p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-center gap-1">
              <span className="text-[9px] text-ford-blue-light uppercase tracking-wider font-semibold">
                Toque para abrir
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "welcome" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center text-center px-8 z-10"
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <PartyPopper className="w-16 h-16 text-ford-blue-light mb-4" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="font-display text-2xl font-bold uppercase tracking-[0.08em]"
            >
              Parabéns, <span className="text-ford-blue-light">Rafael!</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="text-sm text-white/60 mt-3 leading-relaxed"
            >
              Sua <span className="text-white font-semibold">Ford Ranger 2024 Limited</span> está conectada ao Ford Vision.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="text-xs text-white/40 mt-2"
            >
              Uma nova experiência começa agora.
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
              onClick={() => setPhase("reveal")}
              className="mt-8 px-8 py-3 bg-ford-blue-light/10 border border-ford-blue-light text-ford-blue-light font-display text-xs uppercase tracking-[0.3em] hover:bg-ford-blue-light hover:text-white transition-all duration-300"
            >
              Descobrir recursos
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "reveal" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full px-6 z-10 flex flex-col items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-6"
            >
              <Sparkles className="w-4 h-4 text-ford-blue-light" />
              <span className="font-display text-sm uppercase tracking-[0.3em] text-white/60">
                Seus recursos
              </span>
            </motion.div>

            <div className="w-full space-y-3">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                const visible = i <= currentStep;
                return (
                  <AnimatePresence key={i}>
                    {visible && (
                      <motion.div
                        initial={{ opacity: 0, x: -40, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{
                          type: "spring",
                          damping: 20,
                          stiffness: 200,
                        }}
                        className="flex items-center gap-4 p-4 bg-white/[0.03] border border-ford-blue-light/20 rounded-sm"
                      >
                        <div className="w-10 h-10 rounded-full bg-ford-blue-light/10 border border-ford-blue-light/40 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-ford-blue-light" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold">{step.title}</div>
                          <div className="font-mono-tech text-[10px] text-white/40 mt-0.5 uppercase tracking-wider">
                            {step.sub}
                          </div>
                        </div>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3 }}
                          className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center"
                        >
                          <span className="text-green-400 text-[10px]">✓</span>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                );
              })}
            </div>

            <AnimatePresence>
              {currentStep >= STEPS.length - 1 && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  onClick={onFinish}
                  className="mt-8 w-full py-3.5 bg-ford-blue-light text-white font-display font-bold text-xs uppercase tracking-[0.4em] hover:bg-ford-blue transition-colors duration-300 relative overflow-hidden group"
                  style={{
                    clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
                  }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Explorar meu Ford
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
