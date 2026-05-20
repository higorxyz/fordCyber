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
import { getSessionProfile } from "@/lib/auth";

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

function resolveFirstName(name: string | undefined, username: string) {
  const source = (name?.trim() || username.trim() || "Cliente").split(/\s+/)[0] ?? "Cliente";
  if (source.length === 0) return "Cliente";
  return source.charAt(0).toLocaleUpperCase("pt-BR") + source.slice(1);
}

export default function ClientAppPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("onboarding");
  const [authChecked, setAuthChecked] = useState(false);
  const [firstName, setFirstName] = useState("Cliente");

  useEffect(() => {
    let active = true;
    getSessionProfile().then((session) => {
      if (!active) return;
      if (!session) {
        router.push("/");
        return;
      }
      if (session.role === "analista") {
        router.push("/command");
        return;
      }
      setFirstName(resolveFirstName(session.name, session.username));
      setAuthChecked(true);
    });
    return () => {
      active = false;
    };
  }, [router]);

  if (!authChecked) return null;

  return (
    <div className="grain h-[100dvh] bg-black flex flex-col relative overflow-hidden">
      <GradientCanvas />
      <div className="fixed inset-0 hud-grid opacity-50 pointer-events-none" />
      <Navbar />
      <main className="flex-1 min-h-0 relative z-10 md:flex md:items-center md:justify-center md:px-4 md:py-8">
        <div className="w-full h-full md:h-auto md:w-auto md:flex md:flex-col md:items-center md:gap-4">
          <div className="w-full h-full flex flex-col bg-black md:phone-frame md:w-[400px] md:h-[min(820px,calc(100dvh-120px))]">
            <div className="hidden md:flex items-center justify-between px-6 pt-3 pb-1 text-[11px] text-white/80">
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
                    <Onboarding firstName={firstName} onFinish={() => setTab("myford")} />
                  )}
                  {tab === "myford" && <MyFord firstName={firstName} />}
                  {tab === "alerts" && <Alerts />}
                  {tab === "points" && <Points />}
                  {tab === "timeline" && <Timeline />}
                  {tab === "moments" && <KeyMoments />}
                </motion.div>
              </AnimatePresence>
            </div>

            {tab !== "onboarding" && (
              <div className="border-t border-ford-gray-mid bg-black/95 backdrop-blur shrink-0 safe-pad-bottom md:pb-0">
                <div className="grid grid-cols-5 px-2 py-2">
                  {TABS.map((t) => {
                    const Icon = t.icon;
                    const active = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex flex-col items-center gap-0.5 py-2 md:py-1 transition-colors ${
                          active ? "text-ford-blue-light" : "text-white/40"
                        }`}
                      >
                        <Icon className="w-5 h-5 md:w-4 md:h-4" strokeWidth={active ? 2.5 : 2} />
                        <span className="font-semibold tracking-wider uppercase text-[9px] md:text-[8px]">
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
              className="hidden md:inline-flex cta-rimac text-[9px]"
            >
              Pular onboarding
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
