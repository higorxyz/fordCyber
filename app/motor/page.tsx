"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Car,
  Brain,
  Smartphone,
  LayoutDashboard,
  Cpu,
  Target,
  Clock,
  Package,
} from "lucide-react";
import Navbar from "@/components/shared/Navbar";
import { getRole } from "@/lib/auth";

export default function MotorPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let active = true;
    getRole().then((role) => {
      if (!active) return;
      if (!role) router.push("/");
      else if (role === "usuario") router.push("/app");
      else setAuthChecked(true);
    });
    return () => {
      active = false;
    };
  }, [router]);

  if (!authChecked) return null;

  return (
    <div className="grain min-h-screen bg-black flex flex-col relative">
      <div className="fixed inset-0 hud-grid opacity-50 pointer-events-none" />
      <Navbar />
      <main className="flex-1 max-w-[1400px] mx-auto px-6 py-10 w-full relative">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="font-mono-tech text-[10px] uppercase tracking-[0.4em] text-ford-blue-light">
            ARQUITETURA · 03
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-bold tracking-[0.04em] mt-3 uppercase">
            Motor de IA <br />
            <span className="text-ford-blue-light">Ford Vision</span>
          </h1>
          <p className="text-sm text-white/60 mt-3 max-w-2xl mx-auto">
            Como dados de telemetria viram retenção: o pipeline preditivo que
            conecta o veículo conectado à equipe de contato Ford.
          </p>
        </motion.div>

        <div className="relative mx-auto" style={{ maxWidth: 900 }}>
          <svg
            viewBox="0 0 900 600"
            className="w-full h-auto"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="redLine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0068D6" />
                <stop offset="100%" stopColor="#003478" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <line
              x1="450"
              y1="105"
              x2="450"
              y2="200"
              stroke="url(#redLine)"
              strokeWidth="2"
              className="flow-line"
            />
            <line
              x1="450"
              y1="395"
              x2="250"
              y2="490"
              stroke="url(#redLine)"
              strokeWidth="2"
              className="flow-line"
            />
            <line
              x1="450"
              y1="395"
              x2="650"
              y2="490"
              stroke="url(#redLine)"
              strokeWidth="2"
              className="flow-line"
            />
          </svg>

          <Node
            top="0%"
            left="50%"
            icon={<Car className="w-6 h-6" />}
            title="Veículo Conectado"
            subtitle="SYNC · FordPass · Telemetria"
            tags={["Km", "Óleo", "Freios", "Bateria", "Diagnóstico"]}
          />

          <Node
            top="33%"
            left="50%"
            icon={<Brain className="w-6 h-6" />}
            title="Ford Vision AI"
            subtitle="Modelo de ML · Segmentação + Predição"
            tags={[
              "Classifica cliente",
              "Prevê serviço",
              "Calcula urgência",
              "Cruza estoque",
            ]}
            highlight
          />

          <Node
            top="80%"
            left="22%"
            icon={<Smartphone className="w-6 h-6" />}
            title="App Cliente"
            subtitle="Push · WhatsApp"
            tags={["Alertas", "Pontos", "Histórico"]}
          />

          <Node
            top="80%"
            left="78%"
            icon={<LayoutDashboard className="w-6 h-6" />}
            title="Command Center"
            subtitle="Equipe Ford · Concessionárias"
            tags={["Mapa", "Leads", "Estoque"]}
          />
        </div>

        <div className="mt-16">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 text-center mb-6">
            O que o modelo classifica
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
            {[
              { label: "Fiel", desc: "Volta sempre na concessionária", color: "border-green-500/50" },
              { label: "Econômico", desc: "Busca menor preço", color: "border-blue-500/50" },
              { label: "Esquecido", desc: "Precisa de lembrete", color: "border-yellow-500/50" },
              { label: "Abandono", desc: "Risco de migrar", color: "border-ford-red" },
            ].map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`ford-card p-4 border-l-4 ${c.color}`}
              >
                <div className="text-sm font-bold uppercase tracking-wider">
                  {c.label}
                </div>
                <div className="text-[10px] text-white/60 mt-1">{c.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
          <Capability icon={<Cpu />} title="Telemetria em tempo real" />
          <Capability icon={<Target />} title="Predição de serviço" />
          <Capability icon={<Clock />} title="Janela ideal de contato" />
          <Capability icon={<Package />} title="Cruzamento com estoque" />
        </div>

        <motion.blockquote
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16 max-w-3xl mx-auto text-center border-l-4 border-ford-blue-light pl-6 py-3"
        >
          <p className="text-base md:text-lg italic text-white/85 leading-relaxed">
            &quot;O Ford Vision não espera o cliente lembrar da revisão. Ele sabe
            antes do cliente que o carro precisa de atenção, confirma que a
            peça está disponível, e entrega o lead pronto na mão da equipe de
            contato.&quot;
          </p>
        </motion.blockquote>
      </main>
    </div>
  );
}

function Node({
  top,
  left,
  icon,
  title,
  subtitle,
  tags,
  highlight,
}: {
  top: string;
  left: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tags: string[];
  highlight?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ top, left }}
    >
      <div
        className={`ford-card px-5 py-4 min-w-[260px] text-center ${
          highlight
            ? "border-ford-blue-light"
            : ""
        }`}
        style={
          highlight
            ? { boxShadow: "0 0 40px rgba(0,104,214,0.4)" }
            : undefined
        }
      >
        <div
          className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${
            highlight
              ? "bg-ford-blue-light text-white"
              : "bg-ford-blue/30 border border-ford-blue text-ford-blue-light"
          }`}
        >
          {icon}
        </div>
        <div className="text-sm font-bold">{title}</div>
        <div className="text-[9px] uppercase tracking-wider text-white/50 mt-0.5">
          {subtitle}
        </div>
        <div className="flex flex-wrap gap-1 justify-center mt-3">
          {tags.map((t) => (
            <span
              key={t}
              className={`text-[9px] px-2 py-0.5 rounded ${
                highlight
                  ? "bg-ford-blue/40 border border-ford-blue-light/50 text-white"
                  : "bg-black/60 border border-ford-gray-mid text-white/60"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Capability({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="ford-card p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded bg-ford-blue/30 border border-ford-blue-light/50 text-ford-blue-light flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4">
        {icon}
      </div>
      <div className="text-xs font-semibold">{title}</div>
    </div>
  );
}
