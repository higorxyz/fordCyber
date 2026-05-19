"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Map, Radar, Package, Trophy, Globe, Map as Map2D } from "lucide-react";
import Navbar from "@/components/shared/Navbar";
import GradientCanvas from "@/components/shared/GradientCanvas";
import SectionNav from "@/components/command/SectionNav";
import DealerPanel from "@/components/command/DealerPanel";
import LeadsRadar from "@/components/command/LeadsRadar";
import StockControl from "@/components/command/StockControl";
import Performance from "@/components/command/Performance";
import { Dealership } from "@/data/dealerships";
import { getRole } from "@/lib/auth";

const VisionMap = dynamic(() => import("@/components/command/VisionMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-black">
      <div className="text-ford-blue-light text-xs uppercase tracking-[0.3em] animate-pulse">
        Carregando mapa Vision...
      </div>
    </div>
  ),
});

const GlobeMap = dynamic(() => import("@/components/command/GlobeMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 border-2 border-ford-blue-light/30 border-t-ford-blue-light rounded-full animate-spin" />
        <div className="text-ford-blue-light text-xs uppercase tracking-[0.3em] animate-pulse">
          Inicializando Globe 3D...
        </div>
      </div>
    </div>
  ),
});

type Section = "map" | "leads" | "stock" | "performance";

const SECTIONS = [
  { id: "map", label: "Mapa", code: "01", fullLabel: "Mapa Vision", icon: Map },
  { id: "leads", label: "Leads", code: "02", fullLabel: "Radar de Leads", icon: Radar },
  { id: "stock", label: "Estoque", code: "03", fullLabel: "Estoque", icon: Package },
  { id: "performance", label: "Ranking", code: "04", fullLabel: "Performance", icon: Trophy },
] as const;

const sectionVariants = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.2 },
  },
};

export default function CommandPage() {
  const router = useRouter();
  const [section, setSection] = useState<Section>("map");
  const [selected, setSelected] = useState<Dealership | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [mapMode, setMapMode] = useState<"3d" | "2d">("3d");
  const [liveTime, setLiveTime] = useState("");
  const [lastSync, setLastSync] = useState("");
  const [syncing, setSyncing] = useState(false);

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

  useEffect(() => {
    const t = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const doSync = () => {
      setSyncing(true);
      setLastSync(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setTimeout(() => setSyncing(false), 1000);
    };
    doSync();
    const t = setInterval(doSync, 8000);
    return () => clearInterval(t);
  }, []);

  if (!authChecked) return null;

  return (
    <div className="grain min-h-screen bg-black flex flex-col relative">
      <GradientCanvas />
      <div className="fixed inset-0 hud-grid opacity-50 pointer-events-none" />
      <Navbar />

      <SectionNav
        sections={SECTIONS.map((s) => ({ id: s.id, label: s.label, code: s.code }))}
        active={section}
        onSelect={(id) => setSection(id as Section)}
      />

      <div className="border-b border-ford-blue/40 bg-[#0a0a0a]/80 backdrop-blur-sm relative z-10">
        <div className="max-w-[1600px] mx-auto px-6 pl-48 flex items-center justify-between h-12">
          <div className="flex items-center gap-4">
            <span className="font-mono-tech text-[10px] text-ford-blue-light tabular-nums">
              {SECTIONS.find((s) => s.id === section)?.code}
            </span>
            <span className="font-display text-[12px] uppercase tracking-[0.5em] text-white">
              {SECTIONS.find((s) => s.id === section)?.fullLabel}
            </span>
          </div>
          <div className="font-mono-tech flex items-center gap-3 text-[10px] text-white/50 uppercase tracking-wider">
            <span className={`flex items-center gap-1.5 ${syncing ? "text-ford-blue-light" : "text-green-400"} transition-colors duration-300`}>
              <span className="w-2 h-2 rounded-full bg-green-400 live-dot" />
              LIVE
            </span>
            <span className="text-white/30">|</span>
            <span className="tabular-nums text-white/70">{liveTime || "--:--:--"}</span>
            <span className="text-white/30">|</span>
            <span className={`transition-colors duration-500 ${syncing ? "text-ford-blue-light" : ""}`}>
              SYNC {lastSync || "--:--:--"}
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          {section === "map" && (
            <motion.div
              key="map"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="relative h-[calc(100vh-104px)]"
            >
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center bg-black/90 border border-ford-blue/50 rounded-sm overflow-hidden">
                <button
                  onClick={() => setMapMode("3d")}
                  className={`flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-mono-tech transition-all ${
                    mapMode === "3d"
                      ? "bg-ford-blue-light/20 text-ford-blue-light border-r border-ford-blue/50"
                      : "text-white/40 hover:text-white border-r border-ford-blue/50"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  GLOBE 3D
                </button>
                <button
                  onClick={() => setMapMode("2d")}
                  className={`flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-mono-tech transition-all ${
                    mapMode === "2d"
                      ? "bg-ford-blue-light/20 text-ford-blue-light"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  <Map2D className="w-3.5 h-3.5" />
                  MAPA 2D
                </button>
              </div>

              {mapMode === "3d" ? (
                <GlobeMap selected={selected} onSelect={setSelected} />
              ) : (
                <>
                  <VisionMap selected={selected} onSelect={setSelected} />
                  <div className="absolute top-14 left-4 bg-black/90 border border-ford-blue/60 p-3 z-[1000] font-mono-tech text-[10px] uppercase tracking-wider space-y-1.5 bracket">
                    <div className="text-ford-blue-light mb-2">SERVICE SHARE</div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      ALTO &gt; 70%
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      MÉDIO 40-70%
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-ford-red" />
                      BAIXO &lt; 40%
                    </div>
                  </div>
                </>
              )}

              <AnimatePresence>
                {selected && (
                  <DealerPanel
                    dealer={selected}
                    onClose={() => setSelected(null)}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {section === "leads" && (
            <motion.div
              key="leads"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="max-w-[1600px] mx-auto px-6 pl-48 py-6"
            >
              <LeadsRadar />
            </motion.div>
          )}

          {section === "stock" && (
            <motion.div
              key="stock"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="max-w-[1600px] mx-auto px-6 pl-48 py-6"
            >
              <StockControl />
            </motion.div>
          )}

          {section === "performance" && (
            <motion.div
              key="performance"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="max-w-[1600px] mx-auto px-6 pl-48 py-6"
            >
              <Performance />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
