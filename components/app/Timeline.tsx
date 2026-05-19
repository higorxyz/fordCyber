"use client";

import { motion } from "framer-motion";
import { Wrench, Filter, AlertOctagon, Search, ShieldCheck } from "lucide-react";
import { client } from "@/data/client";

const ICONS = {
  revisao: Wrench,
  troca: Filter,
  recall: AlertOctagon,
  inspecao: Search,
};

export default function Timeline() {
  return (
    <div className="px-5 py-5 space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-[0.05em] uppercase">
          <span className="text-ford-blue-light">/</span> Histórico
        </h1>
        <p className="text-[11px] text-white/50 mt-1">
          Cada serviço com selo Ford. Valoriza na revenda.
        </p>
      </div>

      <div className="ford-card p-3 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-green-400" />
        <span className="text-[11px] text-white/80">
          {client.history.length} serviços certificados Ford
        </span>
      </div>

      <div className="relative pl-6">
        <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-ford-blue-light via-ford-blue to-transparent" />
        {client.history
          .slice()
          .reverse()
          .map((h, i) => {
            const Icon = ICONS[h.type];
            return (
              <motion.div
                key={h.invoice}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative mb-5"
              >
                <div className="absolute -left-[22px] top-1 w-4 h-4 rounded-full bg-ford-blue-light border-2 border-black" />
                <div className="ford-card p-3">
                  <div className="flex items-start gap-2">
                    <Icon className="w-4 h-4 text-ford-blue-light mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs font-bold">{h.title}</div>
                      <div className="text-[10px] text-white/50 mt-0.5">
                        {new Date(h.date).toLocaleDateString("pt-BR")} ·{" "}
                        {h.km.toLocaleString("pt-BR")} km
                      </div>
                      <div className="text-[9px] text-ford-blue-light font-mono mt-1">
                        {h.invoice}
                      </div>
                    </div>
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                  </div>
                </div>
              </motion.div>
            );
          })}
      </div>
    </div>
  );
}
