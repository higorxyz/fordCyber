"use client";

import { motion } from "framer-motion";
import { Shield, Gift, Leaf, AlertOctagon, Phone } from "lucide-react";
import { client } from "@/data/client";

const ICONS = {
  shield: Shield,
  gift: Gift,
  leaf: Leaf,
  alert: AlertOctagon,
  phone: Phone,
};

export default function KeyMoments() {
  return (
    <div className="px-5 py-5 space-y-4">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-[0.05em] uppercase">
          Momentos<span className="text-ford-blue-light">·</span>chave
        </h1>
        <p className="text-[11px] text-white/50 mt-1">
          O Vision age sozinho nos momentos certos
        </p>
      </div>
      <div className="space-y-2">
        {client.keyMoments.map((m, i) => {
          const Icon = ICONS[m.icon];
          return (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="ford-card p-3 flex items-start gap-3"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                  m.active
                    ? "bg-ford-blue/30 border-ford-blue-light text-ford-blue-light"
                    : "bg-ford-gray-mid border-ford-gray-mid text-white/40"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-bold">{m.title}</div>
                  {m.active && (
                    <span className="text-[8px] uppercase tracking-wider text-green-400 border border-green-400/40 px-1.5 rounded">
                      ativo
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-white/60 leading-relaxed mt-1">
                  {m.description}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
