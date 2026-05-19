"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Bell, Award, Clock, Sparkles, Wifi, Signal, BatteryFull } from "lucide-react";
import Navbar from "@/components/shared/Navbar";
import GradientCanvas from "@/components/shared/GradientCanvas";
import Onboarding from "@/components/app/Onboarding";
import MyFord from "@/components/app/MyFord";
import Alerts from "@/components/app/Alerts";
import Points from "@/components/app/Points";
import Timeline from "@/components/app/Timeline";
import KeyMoments from "@/components/app/KeyMoments";
import { getRole } from "@/lib/auth";

type Tab = "onboarding" | "myford" | "alerts" | "points" | "timeline" | "moments";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "myford", label: "Meu Ford", icon: Car },
  { id: "alerts", label: "Alertas", icon: Bell },
  { id: "points", label: "Pontos", icon: Award },
  { id: "timeline", label: "Histórico", icon: Clock },
  { id: "moments", label: "Momentos", icon: Sparkles },
];

const tabVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
};

export default function ClientAppPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("onboarding");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let active = true;
    getRole().then((role) => {
      if (!active) return;
      if (!role) router.push("/");
      else if (role === "analista") router.push("/command");
      else setAuthChecked(true);
    });
    return () => {
      active = false;
    };
  }, [router]);

  if (!authChecked) return null;

  return (
    <div className="grain min-h-screen bg-black flex flex-col relative">
      <GradientCanvas />
      <div className="fixed inset-0 hud-grid opacity-50 pointer-events-none" />
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-8 px-4 relative z-10">
        <div className="flex flex-col items-center gap-4">
          <div className="phone-frame w-[400px] h-[820px] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] text-white/80">
              <span className="font-semibold">9:41</span>
              <div className="flex items-center gap-1">
                <Signal className="w-3 h-3" />
                <Wifi className="w-3 h-3" />
                <BatteryFull className="w-4 h-4" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  variants={tabVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="h-full"
                >
                  {tab === "onboarding" && (
                    <Onboarding onFinish={() => setTab("myford")} />
                  )}
                  {tab === "myford" && <MyFord />}
                  {tab === "alerts" && <Alerts />}
                  {tab === "points" && <Points />}
                  {tab === "timeline" && <Timeline />}
                  {tab === "moments" && <KeyMoments />}
                </motion.div>
              </AnimatePresence>
            </div>

            {tab !== "onboarding" && (
              <div className="border-t border-ford-gray-mid bg-black/95 backdrop-blur shrink-0">
                <div className="grid grid-cols-5 px-2 py-2">
                  {TABS.map((t) => {
                    const Icon = t.icon;
                    const active = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex flex-col items-center gap-0.5 py-1 transition-colors ${
                          active ? "text-ford-blue-light" : "text-white/40"
                        }`}
                      >
                        <Icon className="w-4 h-4" strokeWidth={active ? 2.5 : 2} />
                        <span className="text-[8px] font-semibold tracking-wider uppercase">
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {tab === "onboarding" && (
            <button
              onClick={() => setTab("myford")}
              className="cta-rimac text-[9px]"
            >
              Pular onboarding
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
