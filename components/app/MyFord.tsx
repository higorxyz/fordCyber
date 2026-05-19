"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Gauge, MapPin, Droplets, Disc3, Shield, Cog, ChevronLeft, ChevronRight } from "lucide-react";
import { client, Vehicle } from "@/data/client";

const CarViewer3D = dynamic(() => import("./CarViewer3D"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-2 border-ford-blue-light/20 border-t-ford-blue-light rounded-full animate-spin" />
        <span className="font-mono-tech text-[9px] text-ford-blue-light/50 uppercase tracking-[0.3em]">
          Renderizando veículo...
        </span>
      </div>
    </div>
  ),
});

const STATUS_COLOR = {
  good: "text-green-400",
  warn: "text-yellow-400",
  bad: "text-ford-red",
};

const STATUS_BG = {
  good: "bg-green-400",
  warn: "bg-yellow-400",
  bad: "bg-ford-red",
};

const SYS_ICON: Record<string, any> = {
  "Óleo do Motor": Droplets,
  "Freios": Disc3,
  "Pneus": Shield,
  "Motor": Cog,
};

const VEHICLE_SYSTEMS: Record<number, typeof client.systems> = {
  0: client.systems,
  1: [
    { name: "Motor", health: 98, status: "good", detail: "Operação ótima" },
    { name: "Óleo", health: 85, status: "good", detail: "Troca em ~90 dias" },
    { name: "Freios", health: 92, status: "good", detail: "Pastilhas 92%" },
    { name: "Pneus", health: 78, status: "warn", detail: "Alinhamento em breve" },
    { name: "Bateria", health: 96, status: "good", detail: "Tensão 12.8V" },
  ],
};

interface Props {
  firstName?: string;
}

export default function MyFord({ firstName }: Props) {
  const [carIdx, setCarIdx] = useState(0);
  const [slideDir, setSlideDir] = useState(1);
  const vehicles = client.vehicles;
  const v = vehicles[carIdx];
  const systems = VEHICLE_SYSTEMS[carIdx] || client.systems;
  const userFirstName = firstName && firstName.trim().length > 0
    ? firstName.trim()
    : client.name.split(" ")[0];
  const overall = Math.round(
    systems.reduce((s, x) => s + x.health, 0) / systems.length
  );

  const prev = () => {
    setSlideDir(-1);
    setCarIdx((i) => (i - 1 + vehicles.length) % vehicles.length);
  };
  const next = () => {
    setSlideDir(1);
    setCarIdx((i) => (i + 1) % vehicles.length);
  };

  return (
    <div className="relative bg-black">
      <div className="relative h-[340px] md:h-[380px]">
        <CarViewer3D />

        {vehicles.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 flex items-center justify-center rounded-full bg-black/70 border border-ford-blue-light/40 hover:border-ford-blue-light hover:bg-ford-blue/20 transition-colors duration-300 backdrop-blur-sm"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-ford-blue-light" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 flex items-center justify-center rounded-full bg-black/70 border border-ford-blue-light/40 hover:border-ford-blue-light hover:bg-ford-blue/20 transition-colors duration-300 backdrop-blur-sm"
            >
              <ChevronRight className="w-3.5 h-3.5 text-ford-blue-light" />
            </button>
          </>
        )}

        <AnimatePresence mode="wait" custom={slideDir}>
          <motion.div
            key={carIdx}
            custom={slideDir}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d * 80 }),
              center: { opacity: 1, x: 0 },
              exit: (d: number) => ({ opacity: 0, x: d * -80 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute top-3 left-3 right-3 z-10 bg-black/60 backdrop-blur-sm border border-white/8 rounded-sm px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono-tech text-[8px] uppercase tracking-[0.3em] text-white/30">
                  Olá, {userFirstName}
                </div>
                <h1 className="font-display text-lg font-bold tracking-[0.08em] mt-0.5 uppercase leading-none">
                  Meu <span className="text-ford-blue-light">Ford</span>
                </h1>
              </div>
              <div className="text-right">
                <div className="font-display text-[10px] font-bold text-white/80 uppercase tracking-[0.1em]">
                  {v.model}
                </div>
                <div className="font-mono-tech text-[8px] text-white/30 mt-0.5">
                  {v.color}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-white/6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-2.5 h-2.5 text-white/25" />
                  <span className="font-mono-tech text-[10px] text-white/50">{v.plate}</span>
                </div>
                <div className="w-px h-3 bg-white/8" />
                <div className="flex items-center gap-1.5">
                  <Gauge className="w-2.5 h-2.5 text-white/25" />
                  <span className="font-mono-tech text-[10px] text-white/50">{v.km.toLocaleString("pt-BR")} km</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
                <span className="font-mono-tech text-[8px] text-green-400/60 uppercase">Conectado</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
          style={{ background: "linear-gradient(transparent, #000000)" }}
        />
      </div>

      {vehicles.length > 1 && (
        <div className="relative z-10 flex items-center justify-center gap-2 py-2 bg-black -mt-2">
          {vehicles.map((_, i) => (
            <button
              key={i}
              onClick={() => setCarIdx(i)}
              className={`h-2 rounded-full transition-all ${
                i === carIdx
                  ? "bg-ford-blue-light w-5"
                  : "bg-white/30 hover:bg-white/50 w-2"
              }`}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 px-5 pb-0 bg-black">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex items-center justify-between mb-5"
        >
          <span className="font-mono-tech text-[10px] text-white/30 uppercase tracking-[0.2em]">Saúde do veículo</span>
          <AnimatePresence mode="wait" custom={slideDir}>
            <motion.span
              key={carIdx}
              custom={slideDir}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: d * 20 }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: d * -20 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              className={`num-display text-xl ${overall >= 70 ? "text-green-400" : overall >= 50 ? "text-yellow-400" : "text-ford-red"}`}
            >
              {overall}%
            </motion.span>
          </AnimatePresence>
        </motion.div>

        <AnimatePresence mode="wait" custom={slideDir}>
          <motion.div
            key={carIdx}
            custom={slideDir}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d * 50 }),
              center: { opacity: 1, x: 0 },
              exit: (d: number) => ({ opacity: 0, x: d * -50 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="space-y-4"
          >
            {systems.map((s, i) => {
              const Icon = SYS_ICON[s.name] || Shield;
              return (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="font-mono-tech text-[8px] text-ford-blue-light/50 w-4 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Icon className={`w-3.5 h-3.5 ${STATUS_COLOR[s.status]} shrink-0`} strokeWidth={2} />
                  <span className="font-mono-tech text-[10px] text-white/45 w-16 shrink-0 uppercase tracking-wider">
                    {s.name.split(" ").pop()}
                  </span>
                  <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.health}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full ${STATUS_BG[s.status]}`}
                      style={{ opacity: 0.75 }}
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono-tech text-[8px] text-white/30">{s.detail}</span>
                    <span className={`num-display text-[13px] w-10 text-right ${STATUS_COLOR[s.status]}`}>
                      {s.health}%
                    </span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between"
        >
          <span className="font-mono-tech text-[8px] text-white/20 uppercase tracking-[0.15em]">
            FordPass · Sincronizado há 2 min
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
            <span className="font-mono-tech text-[8px] text-green-400/50 uppercase">Conectado</span>
          </span>
        </motion.div>
      </div>
    </div>
  );
}
